#!/usr/bin/env bash
# release.sh — выкат Bookport, после которого откат действительно один шаг (этап 3.3).
#
# Зачем: в манифесте образ был bookport:latest + imagePullPolicy: Always. С плавающим
# тегом откатывать нечего: `kubectl rollout undo` поднимает прежний ReplicaSet, в шаблоне
# которого всё тот же `latest`, и kubelet снова тянет свежий образ — «откат» превращается
# в повторный выкат того же кода. Тег по commit SHA это лечит: у старого ReplicaSet
# остаётся свой неизменяемый образ, а манифест правится одним коммитом, который можно
# развернуть тем же `git revert`.
#
# Режимы: collect (по умолчанию, ничего не трогает) | build | ship | rollback
# Argo CD синхронизирует манифест из Git, поэтому коммит правки = заявка на выкат.
set -uo pipefail

REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
IMAGE_REPO="docker.io/vsedelovede/bookport"
MANIFEST="k8s-deployment.yaml"
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
case "$MODE" in collect|build|ship|rollback) ;; *) die "режим '$MODE' не понятен (collect|build|ship|rollback)" ;; esac

commit=$(git rev-parse --short=12 HEAD 2>/dev/null) || die "нет git-репозитория"
tag="$IMAGE_REPO:$commit"

echo "режим: $MODE"
echo "коммит: $commit"
echo "тег образа: $tag"
echo "сейчас в $MANIFEST: $(grep -m1 'image:' "$MANIFEST" | sed 's/^ *//')"

dirty=$(git status --porcelain --untracked-files=no | head -5)
if [ -n "$dirty" ]; then
  echo "  внимание: в отслеживаемых файлах есть незакоммиченные правки —"
  echo "$dirty" | sed 's/^/    /'
  echo "  собираться будет то, что закоммичено (HEAD), а не то, что лежит в дереве."
fi

run() {
  if [ "$ASSUME_YES" = "1" ]; then
    echo "  -> $*"
    "$@" || die "команда завершилась неудачей: $*"
  else
    echo "  [план] $*"
  fi
}

image_of() { grep -m1 'image:' | sed -E 's/.*image: *//'; }

case "$MODE" in
  collect)
    echo
    echo "будет выполнено по шагам:"
    echo "  1) $0 build --yes   # docker build -t $tag -t $IMAGE_REPO:latest . && docker push"
    echo "  2) $0 ship --yes    # правка image: $tag в $MANIFEST + commit 'release(bookport): $commit'"
    echo "  3) пуш ветки -> Argo CD синхронизирует под"
    echo
    echo "откат: $0 rollback --yes (или git revert <коммит релиза>)"
    last_release=$(git log --format='%h %s' -n 1 --grep='^release(bookport): ' -- "$MANIFEST")
    echo "последний релиз в истории манифеста: ${last_release:-'(таких коммитов ещё нет)'}"
    ;;

  build)
    [ "$ASSUME_YES" = "1" ] || die "build пушает в реестр — нужен --yes"
    command -v docker >/dev/null || die "docker не найден"
    run docker build -t "$tag" -t "$IMAGE_REPO:latest" .
    run docker push "$tag"
    run docker push "$IMAGE_REPO:latest"
    echo "дальше: $0 ship --yes"
    ;;

  ship)
    [ "$ASSUME_YES" = "1" ] || die "ship коммитит правку манифеста — нужен --yes"
    docker image inspect "$tag" >/dev/null 2>&1 || die "локально нет образа $tag — сначала $0 build --yes"
    grep -q "image: $IMAGE_REPO:" "$MANIFEST" || die "в $MANIFEST не нашлась строка 'image: $IMAGE_REPO:...'"
    sed -i.bak -E "s|(image: *)$IMAGE_REPO:.*|\1$tag|" "$MANIFEST" && rm -f "$MANIFEST.bak"
    python3 -c "import yaml; yaml.safe_load(open('$MANIFEST'))" || {
      sed -i.bak -E "s|(image: *)$IMAGE_REPO:.*|\1$(git show HEAD:"$MANIFEST" | image_of)|" "$MANIFEST"
      die "манифест не разбирается как YAML, строка image возвращена"; }
    echo "  стало: $(grep -m1 'image:' "$MANIFEST" | sed 's/^ *//')"
    git add -- "$MANIFEST"
    run git commit -m "release(bookport): $commit"
    ;;

  rollback)
    rel=$(git log --format='%H %s' -n 1 --grep='^release(bookport): ' -- "$MANIFEST")
    [ -n "$rel" ] || die "в истории $MANIFEST нет коммитов 'release(bookport): ...' — откатывать нечего"
    sha=${rel%% *}; subj=${rel#* }
    prev=$(git show "$sha^:$MANIFEST" | image_of)
    echo "релиз:           $subj"
    echo "возвращаем образ: $prev"
    [ "$ASSUME_YES" = "1" ] || die "rollback делает коммит — нужен --yes"
    run git revert --no-edit "$sha"
    echo "готово: Argo CD синхронизирует под на предыдущий образ после пуша"
    ;;
esac
