import { prisma } from "../src/prisma";
import * as fs from "fs";
import { ALIASES, normalize, resolveAgainstIndex } from "../src/utils/ingredientMappingCore";

const DOPUSK_DIR = "/home/sam/code/coder/Bookport_20_Beta/src/assets/ingredients/dopusk";
const ZAPRET_DIR = "/home/sam/code/coder/Bookport_20_Beta/src/assets/ingredients/zapret";
const OUTPUT = "/home/sam/code/coder/Bookport_20_Beta/missing-images.txt";

function indexDir(dir: string): Set<string> {
  const keys = new Set<string>();
  for (const f of fs.readdirSync(dir)) {
    if (/\.(webp|png)$/i.test(f) && !f.includes(":Zone")) {
      keys.add(normalize(f));
    }
  }
  return keys;
}

function targetFile(name: string): string {
  const key = normalize(name);
  const alias = ALIASES[key];
  return `${alias ? normalize(alias) : key}.webp`;
}

async function main() {
  const dopuskKeys = indexDir(DOPUSK_DIR);
  const zapretKeys = indexDir(ZAPRET_DIR);

  const items = await prisma.foodItem.findMany({
    select: { nameRu: true, wfpbStatus: true },
    orderBy: { nameRu: "asc" },
  });

  const greenMissing: string[] = [];
  const forbiddenMissing: string[] = [];
  let green = 0;
  let forbidden = 0;

  for (const item of items) {
    if (item.wfpbStatus === "green") {
      green++;
      if (!resolveAgainstIndex(item.nameRu, dopuskKeys)) {
        greenMissing.push(`${item.nameRu}  →  ${targetFile(item.nameRu)}`);
      }
    } else if (item.wfpbStatus === "forbidden") {
      forbidden++;
      if (!resolveAgainstIndex(item.nameRu, zapretKeys)) {
        forbiddenMissing.push(`${item.nameRu}  →  ${targetFile(item.nameRu)}`);
      }
    }
  }

  const lines: string[] = [
    `=== Разрешенные (green) → dopusk/ (${greenMissing.length}) ===`,
    ...greenMissing,
    "",
    `=== Запрещенные (forbidden) → zapret/ (${forbiddenMissing.length}) ===`,
    ...forbiddenMissing,
    "",
    `Всего записей в БД: ${items.length}`,
    `  green: ${green}`,
    `  forbidden: ${forbidden}`,
    "",
    `Файлов в dopusk/: ${dopuskKeys.size}`,
    `Файлов в zapret/: ${zapretKeys.size}`,
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
