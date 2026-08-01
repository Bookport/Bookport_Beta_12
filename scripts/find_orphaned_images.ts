import { prisma } from "../src/prisma";
import * as fs from "fs";
import { ALIASES, candidateKeys, normalize } from "../src/utils/ingredientMappingCore";
import { getIngredientAlias } from "../src/utils/ingredientAliasMapper";

const DOPUSK_DIR = "/home/sam/code/coder/Bookport_20_Beta/src/assets/ingredients/dopusk";
const ZAPRET_DIR = "/home/sam/code/coder/Bookport_20_Beta/src/assets/ingredients/zapret";
const OUTPUT = "/home/sam/code/coder/Bookport_20_Beta/orphans-list.txt";

// Множество ключей картинок, которые сможет найти этот ингредиент
// (то же пространство поиска, что и у resolveAgainstIndex).
function referencedKeys(name: string): Set<string> {
  const keys = new Set<string>();
  for (const c of candidateKeys(name)) {
    keys.add(c);
    const a = ALIASES[c];
    if (a) keys.add(normalize(a));
  }
  const resolved = getIngredientAlias(name);
  if (resolved !== name) {
    keys.add(normalize(resolved));
    const a2 = ALIASES[resolved];
    if (a2) keys.add(normalize(a2));
  }
  return keys;
}

function imageFiles(dir: string): string[] {
  return fs.readdirSync(dir).filter((f) => /\.(webp|png)$/i.test(f) && !f.includes(":Zone"));
}

async function main() {
  const items = await prisma.foodItem.findMany({ select: { nameRu: true } });

  const referenced = new Set<string>();
  for (const it of items) {
    for (const k of referencedKeys(it.nameRu)) referenced.add(k);
  }

  const orphans: { folder: string; file: string }[] = [];
  for (const [folder, dir] of [
    ["dopusk", DOPUSK_DIR],
    ["zapret", ZAPRET_DIR],
  ] as const) {
    for (const f of imageFiles(dir)) {
      if (!referenced.has(normalize(f))) orphans.push({ folder, file: f });
    }
  }
  orphans.sort((a, b) =>
    a.folder === b.folder ? a.file.localeCompare(b.file, "ru") : a.folder.localeCompare(b.folder)
  );

  const dopuskCount = imageFiles(DOPUSK_DIR).length;
  const zapretCount = imageFiles(ZAPRET_DIR).length;

  const lines: string[] = [
    `=== Сироты: картинки без привязки к БД (${orphans.length}) ===`,
    ...orphans.map((o) => `  ${o.folder}/${o.file}`),
    "",
    `Всего картинок: dopusk=${dopuskCount}, zapret=${zapretCount}`,
  ];

  const output = lines.join("\n");
  fs.writeFileSync(OUTPUT, output, "utf-8");
  console.log(output);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
