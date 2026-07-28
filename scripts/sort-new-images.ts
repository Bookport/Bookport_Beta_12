import fs from "fs";
import path from "path";
import { prisma } from "../src/prisma";

const SOURCE_DIR = "/home/sam/code/coder/INGR_NEW_2";
const DOPUSK_DIR = "/home/sam/code/coder/Bookport_20_Beta/src/assets/ingredients/dopusk";
const ZAPRET_DIR = "/home/sam/code/coder/Bookport_20_Beta/src/assets/ingredients/zapret";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\.webp$/i, "")
    .replace(/_+результат$/i, "")
    .replace(/[_\s]+/g, " ")
    .replace(/ё/g, "е")
    .replace(/\d+$/, "")
    .trim();
}

const FILE_OVERRIDES: Record<string, string> = {
  "кешью жмых": "кешью-жмых",
  "нут рисовый1": "нут рисовый",
  "перец желтый": "перец жёлтый",
};

async function main() {
  const allItems = await prisma.foodItem.findMany({ select: { nameRu: true, wfpbStatus: true } });
  const itemMap = new Map<string, string>();
  const normMap = new Map<string, string>();
  for (const item of allItems) {
    itemMap.set(item.nameRu.toLowerCase(), item.wfpbStatus);
    normMap.set(normalize(item.nameRu), item.nameRu.toLowerCase());
  }

  const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith(".webp"));
  let copiedGreen = 0;
  let copiedForbidden = 0;
  const unmatched: string[] = [];

  for (const file of files) {
    const name = path.parse(file).name;
    const override = FILE_OVERRIDES[name];
    const dbKey = override?.toLowerCase() || name.toLowerCase();
    let status = itemMap.get(dbKey);

    if (!status) {
      const norm = normalize(name);
      const mapped = normMap.get(norm);
      if (mapped) status = itemMap.get(mapped);
    }

    if (!status) {
      const nameLower = name.toLowerCase();
      for (const [dbName, dbStatus] of itemMap) {
        if (dbName.includes(nameLower) || nameLower.includes(dbName)) {
          status = dbStatus;
          break;
        }
      }
    }

    if (status === "green") {
      fs.copyFileSync(path.join(SOURCE_DIR, file), path.join(DOPUSK_DIR, file));
      copiedGreen++;
    } else if (status === "forbidden") {
      fs.copyFileSync(path.join(SOURCE_DIR, file), path.join(ZAPRET_DIR, file));
      copiedForbidden++;
    } else {
      unmatched.push(name);
    }
  }

  console.log(`Скопировано в dopusk: ${copiedGreen}`);
  console.log(`Скопировано в zapret: ${copiedForbidden}`);

  if (unmatched.length > 0) {
    console.log(`\n--- Файлы без совпадения в БД (${unmatched.length}) ---`);
    for (const name of unmatched) console.log(`  ${name}`);
  }

  console.log("\n=== Проверка: остались ли ингредиенты без картинки ===");

  const dopuskFiles = new Set(fs.readdirSync(DOPUSK_DIR).filter(f => f.endsWith(".webp")).map(f => normalize(f)));
  const zapretFiles = new Set(fs.readdirSync(ZAPRET_DIR).filter(f => f.endsWith(".webp")).map(f => normalize(f)));

  const stillMissingGreen: string[] = [];
  const stillMissingForbidden: string[] = [];

  for (const item of allItems) {
    const key = normalize(item.nameRu);
    if (item.wfpbStatus === "green" && !dopuskFiles.has(key)) {
      stillMissingGreen.push(item.nameRu);
    } else if (item.wfpbStatus === "forbidden" && !zapretFiles.has(key)) {
      stillMissingForbidden.push(item.nameRu);
    }
  }

  if (stillMissingGreen.length > 0) {
    console.log(`\nРазрешенные (green) — всё ещё нет картинки (${stillMissingGreen.length}):`);
    for (const name of stillMissingGreen) console.log(`  ${name}`);
  } else {
    console.log("\nВсе разрешенные (green) имеют картинки! ✓");
  }

  if (stillMissingForbidden.length > 0) {
    console.log(`\nЗапрещенные (forbidden) — всё ещё нет картинки (${stillMissingForbidden.length}):`);
    for (const name of stillMissingForbidden) console.log(`  ${name}`);
  } else {
    console.log("\nВсе запрещенные (forbidden) имеют картинки! ✓");
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect().catch(() => {});
  process.exit(1);
});
