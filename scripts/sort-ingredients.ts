import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SOURCE_DIR = "/home/sam/code/coder/INGR_NEW";
const DEST_DIR = "/home/sam/code/coder/Bookport_20_Beta/src/assets/ingredients";
const DOPUSK_DIR = path.join(DEST_DIR, "dopusk");
const ZAPRET_DIR = path.join(DEST_DIR, "zapret");

// Manual mapping: image filename (without .webp) → DB nameRu
const NAME_MAP: Record<string, string> = {
  "абрикос": "абрикосы",
  "агар": "агар-агар",
  "базилик сушеный": "базилик",
  "банан сушеный": "банан",
  "брюссельская капуста": "капуста брюссельская",
  "вишня вяленая": "вишня",
  "грецкий орех": "грецкие орехи",
  "енки": "вешенки",
  "зеленый горошек": "зеленый горошек замороженный",
  "зира": "тмин",
  "иван": "иван-чай",
  "имбирь корень": "имбирь",
  "имбирь сушеный": "имбирь",
  "инжир сушеный": "инжир",
  "йва": "айва",
  "кардамон молотый": "кардамон",
  "каштан": "каштан",
  "кедровый орех": "кедровые орехи",
  "кисточка черники": "черника",
  "клюква вяленая": "клюква",
  "кориандр молотый": "кориандр",
  "корица молотая": "корица",
  "кунжут черный": "кунжут чёрный",
  "кунжут белый": "семена кунжута белые",
  "семена тыквы": "тыквенные семечки",
  "кус": "кус-кус",
  "лук зеленый": "зелёный лук",
  "лук репчатый": "лук",
  "лук сушеный": "лук",
  "майоран": "майоран",
  "мак": "мак",
  "мускатный орех молотый": "мускатный орех",
  "мята сушеная": "мята",
  "пажитник": "пажитник",
  "паприка копченая": "паприка",
  "пекинская капуста": "капуста пекинская",
  "перец болгарский": "сладкий перец",
  "персик": "персики",
  "салат латук": "салат",
  "сельдерей стебли": "сельдерей",
  "семена чиа": "семена чиа белые",
  "спаржа": "спаржа",
  "тархун сушеный": "тархун",
  "урбеч из абрикосовых косточек ": "урбеч из абрикосовых косточек",
  "цветная капуста": "капуста цветная",
  "чеснок сушеный": "чеснок",
  "щавель": "щавель",
  "яблоки сушеные": "сушеные яблоки",
};

function normalize(s: string): string {
  return s.replace(/[\s-]+/g, "").replace(/ё/g, "е").toLowerCase();
}

async function main() {
  for (const dir of [DOPUSK_DIR, ZAPRET_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const allFiles = fs.readdirSync(SOURCE_DIR).filter((f) => f.endsWith(".webp"));

  const stubs = ["ingr_green.webp", "ingr_red.webp"];
  const ingredientFiles = allFiles.filter((f) => !stubs.includes(f));

  const allItems = await prisma.foodItem.findMany({ select: { nameRu: true, wfpbStatus: true } });
  const itemMap = new Map<string, string>();
  const normMap = new Map<string, string>();
  for (const item of allItems) {
    itemMap.set(item.nameRu.toLowerCase(), item.wfpbStatus);
    normMap.set(normalize(item.nameRu), item.nameRu.toLowerCase());
  }

  let greenCount = 0;
  let redCount = 0;
  const unmatched: string[] = [];
  const missingGreen: string[] = [];
  const missingRed: string[] = [];
  const foundInDb = new Set<string>();

  for (const file of ingredientFiles) {
    const name = path.parse(file).name;
    const src = path.join(SOURCE_DIR, file);

    // 1. Manual mapping
    const mapped = NAME_MAP[name];
    const dbName = mapped?.toLowerCase() || name.toLowerCase();
    let status = itemMap.get(dbName);

    // 2. Exact match
    if (!status) {
      status = itemMap.get(name.toLowerCase());
    }

    // 3. Normalized match (remove spaces/hyphens)
    if (!status) {
      const norm = normalize(name);
      const dbKey = normMap.get(norm);
      if (dbKey) status = itemMap.get(dbKey);
    }

    // 4. Substring match (last resort)
    if (!status) {
      const nameLower = name.toLowerCase();
      for (const [dbName, dbStatus] of itemMap) {
        if (dbName.includes(nameLower) || nameLower.includes(dbName)) {
          status = dbStatus;
          break;
        }
      }
    }

    if (status === "green" || status === "forbidden") {
      const destDir = status === "green" ? DOPUSK_DIR : ZAPRET_DIR;
      fs.copyFileSync(src, path.join(destDir, file));
      if (status === "green") greenCount++;
      else redCount++;
      foundInDb.add(mapped?.toLowerCase() || name.toLowerCase());
    } else {
      unmatched.push(name);
    }
  }

  // Copy stubs
  for (const stub of stubs) {
    const src = path.join(SOURCE_DIR, stub);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(DEST_DIR, stub));
    }
  }

  // Find items with no image
  for (const item of allItems) {
    const key = item.nameRu.toLowerCase();
    if (!foundInDb.has(key)) {
      if (item.wfpbStatus === "green") missingGreen.push(item.nameRu);
      else if (item.wfpbStatus === "forbidden") missingRed.push(item.nameRu);
    }
  }

  console.log("\n===== РЕЗУЛЬТАТЫ =====");
  console.log(`Разрешённые (WFPB) скопировано: ${greenCount}`);
  console.log(`Запрещённые (Non-WFPB) скопировано: ${redCount}`);
  console.log(`Всего обработано: ${greenCount + redCount} из ${ingredientFiles.length}`);

  if (unmatched.length > 0) {
    console.log(`\n--- Файлы без совпадения в БД — ${unmatched.length} ---`);
    for (const name of unmatched) console.log(`  ${name}`);
  }

  if (missingGreen.length > 0) {
    console.log(`\n--- Нет картинки (разрешённые) — ${missingGreen.length} ---`);
    for (const name of missingGreen) console.log(`  ${name}`);
  }
  if (missingRed.length > 0) {
    console.log(`\n--- Нет картинки (запрещённые) — ${missingRed.length} ---`);
    for (const name of missingRed) console.log(`  ${name}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect().catch(() => {});
  process.exit(1);
});
