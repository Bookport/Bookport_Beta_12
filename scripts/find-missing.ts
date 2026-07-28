import { prisma } from "../src/prisma";
import * as fs from "fs";
import * as path from "path";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\.(webp|png)$/i, "")
    .replace(/_*результат$/i, "")
    .replace(/\)+$/, "")
    .replace(/_+$/, "")
    .replace(/[_\s]+/g, " ")
    .replace(/ё/g, "е")
    .trim();
}

const DOPUSK_DIR = "/home/sam/code/coder/Bookport_20_Beta/src/assets/ingredients/dopusk";
const ZAPRET_DIR = "/home/sam/code/coder/Bookport_20_Beta/src/assets/ingredients/zapret";
const OUTPUT = "/home/sam/code/coder/Bookport_20_Beta/missing-images.txt";

async function main() {
  const items = await prisma.foodItem.findMany({
    select: { nameRu: true, wfpbStatus: true },
    orderBy: { nameRu: "asc" },
  });

  // Index actual image files by normalized name
  function indexDir(dir: string): Set<string> {
    const files = new Set<string>();
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith(".webp") && !f.includes(":Zone")) {
        files.add(normalize(f));
      }
    }
    return files;
  }

  const dopuskIndex = indexDir(DOPUSK_DIR);
  const zapretIndex = indexDir(ZAPRET_DIR);

  const greenMissing: string[] = [];
  const forbiddenMissing: string[] = [];

  for (const item of items) {
    const key = normalize(item.nameRu);
    if (item.wfpbStatus === "green") {
      if (!dopuskIndex.has(key)) greenMissing.push(item.nameRu);
    } else if (item.wfpbStatus === "forbidden") {
      if (!zapretIndex.has(key)) forbiddenMissing.push(item.nameRu);
    }
  }

  const lines: string[] = [
    `=== Разрешенные (green) — нет картинки (${greenMissing.length}) ===`,
    ...greenMissing.map(n => `  ${n}`),
    "",
    `=== Запрещенные (forbidden) — нет картинки (${forbiddenMissing.length}) ===`,
    ...forbiddenMissing.map(n => `  ${n}`),
    "",
    `Всего записей в БД: ${items.length}`,
    `  green: ${items.filter(i => i.wfpbStatus === "green").length}`,
    `  forbidden: ${items.filter(i => i.wfpbStatus === "forbidden").length}`,
    "",
    `Файлов в dopusk/: ${dopuskIndex.size}`,
    `Файлов в zapret/: ${zapretIndex.size}`,
  ];

  const output = lines.join("\n");
  fs.writeFileSync(OUTPUT, output, "utf-8");
  console.log(output);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
