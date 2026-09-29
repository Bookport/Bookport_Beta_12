#!/usr/bin/env bash
# release.sh — выкат Bookport через GitOps: образ по SHA коммита, манифест в репозитории v9e.
#
# Почему так:
# 1) Argo CD приложения `v9e-bookport` синхронизирует НЕ это приложение, а каталог
#    `apps/bookport` репозитория `git@github.com:vsedelovede/v9e.git`, ветка `feat/bookport`
#    (проверено по argocd/bookport-app.yaml и живым objects в кластере 28.09). Значит правка
#    манифеста здесь, в app-репозитории, на под не влияет вовсе — отсюда и открытый пункт
#    аудита «release.sh правит не тот манифест». Здесь единственная точка правки — v9e.
# 2) Тег по commit SHA + digest в манифесте. С `:latest` + `imagePullPolicy: Always` откат
#    нечего откатывать: прежний ReplicaSet тянет тот же свежий образ. Digest обязателен
#    дополнительно: тег в реестре перезаписываем, digest — нет.
# 3) Собирать только из HEAD (git worktree), а не из рабочего дерева: в дереве постоянно
#    живут незакоммиченные правки параллельной разработки, они не заявлены к выкату.
#
# Режимы: collect (по умолчанию, ничего не трогает) | build | ship | all | rollback
# `--yes` обязателен для build/ship/all/rollback: они пушают в реестр и коммитят в v9e,
# а коммит в v9e после пуша = заявка на выкат (Argo подхватывает ветку сам).
set -uo pipefail

REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
IMAGE_REPO="docker.io/vsedelovede/bookport"
GITOPS_DIR=${GITOPS_DIR:-/home/sam/vps/v9e}
GITOPS_BRANCH=${GITOPS_BRANCH:-feat/bookport}
MANIFEST_REL="apps/bookport/deploy/k8s/40-app.yaml"
MANIFEST="$GITOPS_DIR/$MANIFEST_REL"
cd "$REPO_ROOT" || exit 2

die() { echo "release.sh: $*" >&2; exit 1; }

MODE="${1:-collect}"; shift || true
ASSUME_YES=0
for a in "$@"; do
  case "$a" in
    --yes) ASSUME_YES=1 ;;
    *) die "неизвестный аргумент '$a' (есть только --yes)" ;;
  esac
done
case "$MODE" in collect|build|ship|all|rollback) ;; *) die "режим '$MODE' не понятен (collect|build|ship|all|rollback)" ;; esac

commit=$(git rev-parse --short=12 HEAD 2>/dev/null) || die "нет git-репозитория"
tag="$IMAGE_REPO:$commit"

[ -d "$GITOPS_DIR/.git" ] || die "не вижу git-репозиторий в $GITOPS_DIR (переменная GITOPS_DIR)"
[ -f "$MANIFEST" ] || die "в $GITOPS_DIR нет $MANIFEST_REL"

image_of() { grep -m1 'image:' "$MANIFEST" | sed -E 's/.*image: *//'; }

echo "режим:      $MODE"
echo "коммит:     $commit"
echo "тег образа: $tag"
echo "манифест:   $MANIFEST"
echo "сейчас:     $(image_of)"
echo "ветка v9e:  $(git -C "$GITOPS_DIR" rev-parse --abbrev-ref HEAD) (ожидаем $GITOPS_BRANCH)"

if [ "$(git -C "$GITOPS_DIR" rev-parse --abbrev-ref HEAD)" != "$GITOPS_BRANCH" ]; then
  echo "  внимание: в $GITOPS_DIR checking out другая ветка — Argo смотрит на $GITOPS_BRANCH"
fi

dirty=$(git status --porcelain --untracked-files=no | head -5)
if [ -n "$dirty" ]; then
  echo "  внимание: здесь есть незакоммиченные правки ($commit не включает их) —"
  echo "$dirty" | sed 's/^/    /'
  echo "  образ собирается из HEAD, то есть без них."
fi
gdirty=$(git -C "$GITOPS_DIR" status --porcelain --untracked-files=no | head -5)
if [ -n "$gdirty" ]; then
  echo "  внимание: в $GITOPS_DIR есть незакоммиченные правки —"
  echo "$gdirty" | sed 's/^/    /'
  echo "  их Argo не увидит (он читает коммиты), но они попадут в этот коммит релиза, если"
  echo "  лежат в $MANIFEST_REL. Проверьте диф перед пушем."
fi

run() {
  if [ "$ASSUME_YES" = "1" ]; then
    echo "  -> $*"
    "$@" || die "команда завершилась неудачей: $*"
  else
    echo "  [план] $*"
  fi
}

do_build() {
  [ "$ASSUME_YES" = "1" ] || die "build пушает в реестр — нужен --yes"
  command -v docker >/dev/null || die "docker не найден"
  WT_DIR=$(mktemp -d /tmp/release-head.XXXXXX) || die "mktemp не дался"
  rmdir "$WT_DIR"
  git worktree add --detach "$WT_DIR" HEAD >/dev/null || die "не удалось собрать checkout от HEAD"
  # Cleanup по EXIT, а не по RETURN: die() может выйти из середины функции, и тогда
  # worktree остался бы висеть в `git worktree list` и в /tmp.
  trap 'git worktree remove --force "$WT_DIR" >/dev/null 2>&1 || true' EXIT
  ( cd "$WT_DIR" && docker build -t "$tag" . ) || die "docker build из HEAD ($commit) не собрался"
  docker push "$tag" || die "docker push не удался — проверь docker login в $IMAGE_REPO"
  # Тег в Docker Hub перезаписывают, digest — нет; манифест пиним по digest, как уже сделано
  # в живом проде (`...:12.0.0-beta.1@sha256:890b…`).
  digest=$(docker image inspect --format '{{index .RepoDigests 0}}' "$tag" 2>/dev/null | sed 's/.*@//')
  [ -n "$digest" ] || die "не удалось получить digest запушенного образа $tag"
  echo "$digest" > "/tmp/release-digest-$commit"
  echo "образ: $tag@$digest"
}

do_ship() {
  [ "$ASSUME_YES" = "1" ] || die "ship коммитит в $GITOPS_DIR — нужен --yes"
  digest=""
  [ -s "/tmp/release-digest-$commit" ] && digest=$(cat "/tmp/release-digest-$commit")
  [ -n "$digest" ] || digest=$(docker image inspect --format '{{index .RepoDigests 0}}' "$tag" 2>/dev/null | sed 's/.*@//')
  [ -n "$digest" ] || die "нет digest для $tag — сначала $MODE-совместимый $0 build --yes (или docker pull $tag)"
  grep -q "image: $IMAGE_REPO:" "$MANIFEST" || die "в $MANIFEST не нашлась строка 'image: $IMAGE_REPO:...'"
  sed -i.bak -E "s|(image: *)$IMAGE_REPO:.*|\1$tag@$digest|" "$MANIFEST" && rm -f "$MANIFEST.bak"
  if ! python3 -c "import yaml; list(yaml.safe_load_all(open('$MANIFEST')))" 2>/dev/null; then
    git -C "$GITOPS_DIR" checkout -- "$MANIFEST_REL"
    die "манифест не разбирается как YAML — строка image возвращена из HEAD"
  fi
  echo "  стало: $(image_of)"
  git -C "$GITOPS_DIR" add -- "$MANIFEST_REL"
  run git -C "$GITOPS_DIR" commit -m "release(bookport): $commit@$digest"
  echo "дальше: git -C $GITOPS_DIR push origin $GITOPS_BRANCH  # после пуша Argo синхронизирует сам"
}

do_rollback() {
  [ "$ASSUME_YES" = "1" ] || die "rollback делает коммит в $GITOPS_DIR — нужен --yes"
  rel=$(git -C "$GITOPS_DIR" log --format='%H %s' -n 1 --grep='^release(bookport): ' -- "$MANIFEST_REL")
  [ -n "$rel" ] || die "в истории $MANIFEST_REL нет коммитов 'release(bookport): ...' — откатывать нечего"
  sha=${rel%% *}; subj=${rel#* }
  prev=$(git -C "$GITOPS_DIR" show "$sha^:$MANIFEST_REL" | grep -m1 'image:' | sed -E 's/.*image: *//')
  echo "релиз:            $subj"
  echo "возвращаем образ: $prev"
  run git -C "$GITOPS_DIR" revert --no-edit "$sha"
  echo "дальше: git -C $GITOPS_DIR push origin $GITOPS_BRANCH"
  echo "заметка: откат манифеста не откатывает схему БД — миграции Prisma остаются применёнными."
}

case "$MODE" in
  collect)
    echo
    echo "будет выполнено по шагам:"
    echo "  1) $0 build --yes   # docker build из HEAD + push $tag + digest"
    echo "  2) $0 ship --yes    # image: … → $tag@<digest> в $MANIFEST_REL + коммит"
    echo "  3) git -C $GITOPS_DIR push origin $GITOPS_BRANCH   # после этого Argo выкатывает"
    echo
    echo "  одной командой: $0 all --yes (build + ship, без пуша)"
    echo "откат:          $0 rollback --yes"
    last_release=$(git -C "$GITOPS_DIR" log --format='%h %s' -n 1 --grep='^release(bookport): ' -- "$MANIFEST_REL")
    echo "последний релиз в истории манифеста: ${last_release:-'(таких коммитов ещё нет)'}"
    ;;
  build)  do_build ;;
  ship)   do_ship ;;
  all)    do_build; do_ship ;;
  rollback) do_rollback ;;
esac
