#!/usr/bin/env bash
# ci-check.sh — проверки, которые должен гонять CI (этап 3.4).
#
# Зачем: до этого раунда в репозитории не было ни одного CI-конфига, и «зелёность» означала
# «у разработчика на машине собралось». Так и жил блокер 3.9: `docker build` с чистого checkout
# не проходил (в стадию builder не копировались два корневых JSON), а локально дефект невиден —
# файлы лежат в рабочем дереве. Поэтому здесь отдельно проверяются (а) то, что лежит в HEAD,
# а не в рабочем дереве, и (б) что образ из HEAD действительно собирается.
#
# Режимы: all (по умолчанию) | typecheck | client | server | schema | image
# Все режимы только собирают и сравнивают; никуда не пушат и не трогают рабочие базы.
#
# Переменные окружения:
#   CHECK_DATABASE_URL — БД-«тень» для режима schema. Обязана называться bookport_ci_*:
#                        prisma migrate diff пересоздаёт в ней схемы, поэтому боевую БД
#                        скрипт намеренно не примет.
set -uo pipefail

REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$REPO_ROOT" || exit 2

die() { echo "ci-check.sh: $*" >&2; exit 1; }

MODE="${1:-all}"; shift || true
case "$MODE" in all|typecheck|client|server|schema|image) ;; *) die "режим '$MODE' не понятен (all|typecheck|client|server|schema|image)" ;; esac

[ -d node_modules ] || die "нет node_modules — сначала npm ci"

FAILS=0
WT_DIR=""
cleanup() {
  [ -n "$WT_DIR" ] || return 0
  git worktree remove --force "$WT_DIR" >/dev/null 2>&1 || true
  WT_DIR=""
}
# EXIT, а не RETURN: die() выходит из середины do_image, и worktree иначе остаётся висеть
# в `git worktree list` и в /tmp (проверено на обратной пробе 3.9).
trap cleanup EXIT

step() {  # step <имя> <команда...>
  local name=$1; shift
  echo
  echo "--- $name"
  if "$@"; then
    echo "  ОК: $name"
  else
    echo "  ПАДЕНИЕ: $name (exit=$?)"
    FAILS=$((FAILS + 1))
  fi
}

do_typecheck() { npx tsc --noEmit; }

# Клиент собирается ровно той же командой, что и Dockerfile: расхождение этих двух строк
# и есть дефект контекста.
do_client() {
  npx vite build
  [ -f dist/index.html ] || die "vite build отработал, но dist/index.html нет"
  echo "  артефакт: dist/ $(find dist -type f | wc -l) файлов, $(du -sm dist | cut -f1) МиБ"
}

do_server() {
  npx esbuild server.ts --bundle --platform=node --format=esm \
      --packages=external --sourcemap --outfile=build/server.mjs
  [ -s build/server.mjs ] || die "build/server.mjs пустой"
  echo "  артефакт: build/server.mjs $(wc -c < build/server.mjs) Б"
}

# Миграции должны описывать ту же схему, что и schema.prisma: расхождение здесь означает,
# что на проде `prisma migrate deploy` поднимет не то, под что написан код.
do_schema() {
  url=${CHECK_DATABASE_URL:-}
  [ -n "$url" ] || { echo "  CHECK_DATABASE_URL не задан — сверку схемы пропускаем"; return 0; }
  case "$url" in
    *bookport_ci_*) ;;
    *) die "CHECK_DATABASE_URL обязан указывать на БД вида bookport_ci_* (она пересоздаётся); боевую БД здесь не даём" ;;
  esac
  npx prisma migrate diff --from-migrations prisma/migrations \
    --shadow-database-url "$url" \
    --to-schema-datamodel prisma/schema.prisma --exit-code
}

# Самая длинная, и самая нужная: собирается из HEAD в отдельном worktree, поэтому незакоммиченные
# файлы рабочей копии отсюда не подделают «зелёный» результат.
do_image() {
  command -v docker >/dev/null || die "docker не найден"
  WT_DIR=$(mktemp -d /tmp/ci-check-head.XXXXXX) || die "mktemp не дался"
  rmdir "$WT_DIR"
  git worktree add --detach "$WT_DIR" HEAD >/dev/null 2>&1 || die "не удалось собрать worktree от HEAD"

  # Дешёвая предварительная проверка: каждый источник COPY обязан существовать в checkout.
  # Это ровно тот класс дефекта, что и 3.9, и ловится он до минут сборки.
  missing=0
  while read -r src; do
    [ -n "$src" ] || continue
    [ -e "$WT_DIR/$src" ] || { echo "  Dockerfile копирует '$src', которого нет в HEAD"; missing=$((missing + 1)); }
  done < <(awk '/^COPY /{ f=0; for(i=2;i<=NF;i++) if($i ~ /^--from=/) f=1; if(f) next; last=NF; for(i=2;i<last;i++) if($i !~ /^--/) print $i }' "$WT_DIR/Dockerfile" | sed 's#/$##')
  [ "$missing" = "0" ] || die "в Dockerfile $missing строк(и) COPY на несуществующий файл"
  echo "  все источники COPY есть в HEAD"

  local tag="bookport-ci-check:$(git rev-parse --short=12 HEAD)"
  ( cd "$WT_DIR" && docker build -t "$tag" . ) || die "docker build из HEAD не собрался"
  if [ "${KEEP_IMAGE:-0}" = "1" ]; then
    echo "  образ оставлен: $tag"
  else
    docker image rm "$tag" >/dev/null || true
    echo "  образ собрался и удалён ($tag): проверяется сборка, а не артефакт; KEEP_IMAGE=1 — чтобы оставить"
  fi
}

case "$MODE" in
  typecheck) step "typecheck (tsc --noEmit)" do_typecheck ;;
  client)    step "сборка клиента (vite build)" do_client ;;
  server)    step "серверный бандл (esbuild)" do_server ;;
  schema)    step "миграции против схемы" do_schema ;;
  image)     step "образ из HEAD (docker build)" do_image ;;
  all)
    step "typecheck (tsc --noEmit)" do_typecheck
    step "сборка клиента (vite build)" do_client
    step "серверный бандл (esbuild)" do_server
    step "миграции против схемы" do_schema
    step "образ из HEAD (docker build)" do_image
    ;;
esac

echo
if [ "$FAILS" = "0" ]; then
  echo "ci-check.sh ($MODE): все проверки пройдены"
else
  echo "ci-check.sh ($MODE): провалено проверок: $FAILS"
fi
exit "$FAILS"
