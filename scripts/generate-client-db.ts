/**
 * Генератор клиентской базы нутриентов на 100г
 * Источник: NAShA-BAZA_FULL_NUTRIENTS_FIXED.csv (566 записей, 60+ полей)
 * Выход: src/data/clientNutrientDB.ts (Record<string, ClientNutrientProfile> + getClientProfile)
 *
 * Запуск: npx tsx scripts/generate-client-db.ts
 * или: node --loader ts-node/esm scripts/generate-client-db.ts
 *
 * Не трогает сервер/BD, только клиентский хардкод.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_PATH = path.resolve(__dirname, "../NAShA-BAZA_FULL_NUTRIENTS_FIXED.csv");
const OUT_PATH = path.resolve(__dirname, "../src/data/clientNutrientDB.ts");

// Те же нормализаторы что и на клиенте (ingredientMappingCore.normalize)
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.(webp|png)$/i, "")
    .replace(/_*результат$/i, "")
    .replace(/\)+$/, "")
    .replace(/_+$/, "")
    .replace(/\.+$/, "")
    .replace(/%/g, "")
    .replace(/[_\s]+/g, " ")
    .replace(/ё/g, "е")
    .trim();
}

// Поля на 100г — полный FoodItem (совпадает с server.ts NUTRIENT_FIELDS + extras)
// Порядок как в CSV header без id/fdcId/nameRu/nameEn/wfpbStatus/createdAt
const NUTRIENT_KEYS = [
  "calories","protein","fat","carbohydrates","water","fiber","sugarTotal","sucrose","glucose","fructose","lactose","maltose",
  "saturatedFat","monounsaturatedFat","polyunsaturatedFat","transFat","cholesterol","omega3","omega6","calcium","iron","magnesium","phosphorus","potassium","sodium","zinc","copper","manganese","selenium","vitaminC","thiamin","riboflavin","niacin","pantothenicAcid","vitaminB6","biotin","folate","vitaminB12","vitaminA","vitaminD","vitaminE","vitaminK","lysine","methionine","alanine","arginine","asparticAcid","betaCarotene","cystine","glutamicAcid","glycine","histidine","iodine","isoleucine","leucine","omega9","phenylalanine","proline","retinol","serine","threonine","tryptophan","tyrosine","valine","vitaminD2","vitaminD3",
] as const;

type Profile = Record<(typeof NUTRIENT_KEYS)[number], number>;

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = parseCSVLine(lines[0]).map((h) => h.replace(/^"|"$/g, ""));
  const idx: Record<string, number> = {};
  header.forEach((h, i) => (idx[h] = i));

  const missingKeys = NUTRIENT_KEYS.filter((k) => idx[k] == null);
  if (missingKeys.length) {
    console.error("Missing nutrient columns in CSV:", missingKeys);
    process.exit(1);
  }

  const db: Record<string, Profile> = {};
  let count = 0;
  let skipped = 0;

  for (let li = 1; li < lines.length; li++) {
    const cols = parseCSVLine(lines[li]);
    // защита от кривых строк
    if (cols.length < header.length) {
      // попытка склейки если внутри кавычек перенос — уже split по \n, но CSV может содержать \n в поле?
      // В нашем файле таких нет, пропускаем
      console.warn(`skip line ${li + 1}: col len ${cols.length} != ${header.length}`);
      skipped++;
      continue;
    }
    const nameRuRaw = (cols[idx["nameRu"]] || "").replace(/^"|"$/g, "").trim();
    if (!nameRuRaw) { skipped++; continue; }
    const key = normalize(nameRuRaw);
    if (!key) { skipped++; continue; }
    if (db[key]) {
      // дубликат нормализованного ключа — оставляем первый (обычно green, более точный)
      continue;
    }
    const profile: Profile = {} as Profile;
    for (const k of NUTRIENT_KEYS) {
      const vStr = (cols[idx[k]] || "0").replace(/^"|"$/g, "").replace(",", ".").trim();
      const v = parseFloat(vStr);
      profile[k] = Number.isFinite(v) ? v : 0;
    }
    db[key] = profile;
    count++;
  }

  console.log(`Parsed ${count} profiles, skipped ${skipped}, keys example: ${Object.keys(db).slice(0,5).join(", ")}`);

  // Проверка базовых продуктов из Книги
  const probes = ["овсяные хлопья","яблоко","корица","нут","чечевица","семена льна","льняная мука","гречка зеленая","банан","тыква","морковь","помидор","лук","имбирь","мисо","грецкие орехи"];
  for (const p of probes) {
    const k = normalize(p);
    console.log(` probe "${p}" (${k}): ${db[k] ? "FOUND" : "MISSING"}`);
  }

  // Генерация TS
  const sortedKeys = Object.keys(db).sort((a,b)=> a.localeCompare(b,"ru"));
  const linesOut: string[] = [];
  linesOut.push(`// AUTO-GENERATED from NAShA-BAZA_FULL_NUTRIENTS_FIXED.csv — ${count} профилей на 100г`);
  linesOut.push(`// Не редактировать вручную, перегенерировать: npx tsx scripts/generate-client-db.ts`);
  linesOut.push(`// Источник: FoodItem (Prisma) 60+ полей, единицы как в server.ts NUTRIENT_UNITS / nutrientConstants.getUnit`);
  linesOut.push(``);
  linesOut.push(`export interface ClientNutrientProfile {`);
  for (const k of NUTRIENT_KEYS) {
    linesOut.push(`  ${k}: number;`);
  }
  linesOut.push(`}`);
  linesOut.push(``);
  linesOut.push(`export const CLIENT_NUTRIENT_DB: Record<string, ClientNutrientProfile> = {`);
  for (const key of sortedKeys) {
    const prof = db[key];
    // компактная запись: ключи в кавычках, значения через запятую
    const vals = NUTRIENT_KEYS.map((k) => `${k}:${(prof as any)[k]}`).join(", ");
    // экранируем ключ
    const escKey = key.replace(/\\/g,"\\\\").replace(/"/g,'\\"');
    linesOut.push(`  "${escKey}": { ${vals} },`);
  }
  linesOut.push(`};`);
  linesOut.push(``);
  linesOut.push(`// Нормализация как в src/utils/ingredientMappingCore.ts`);
  linesOut.push(`function normalizeClientName(name: string): string {`);
  linesOut.push(`  return name.toLowerCase().replace(/\\.(webp|png)$/i,"").replace(/_*(результат)$/i,"").replace(/\\)+$/,"").replace(/_+$/,"").replace(/\\.+$/,"").replace(/%/g,"").replace(/[_\\s]+/g," ").replace(/ё/g,"е").trim();`);
  linesOut.push(`}`);
  linesOut.push(``);
  linesOut.push(`// BOOK_SYNONYMS — точечные алиасы из src/utils/bookRecipeNutrients.ts (нормализованные ключи)`);
  linesOut.push(`// Импортировать нельзя из-за prisma, поэтому копия нормализованных пар для резолва`);
  linesOut.push(`const BOOK_SYNONYMS_NORM: Record<string,string> = {`);
  // Вставим реальные нормализованные алиасы — прочитаем из bookRecipeNutrients.ts динамически если файл есть
  // dedup по нормализованному ключу (ё->е коллизии: "зелёной" vs "зеленой")
  const seenSyn = new Set<string>();
  try {
    const brPath = path.resolve(__dirname, "../src/utils/bookRecipeNutrients.ts");
    const brRaw = fs.readFileSync(brPath, "utf-8");
    const m = brRaw.match(/export const BOOK_SYNONYMS[^=]*=\s*\{([\s\S]*?)\n\};/);
    if (m) {
      const re = /"([^"]+)"\s*:\s*"([^"]+)"/g;
      let mm: RegExpExecArray | null;
      while ((mm = re.exec(m[1])) !== null) {
        const kNorm = normalize(mm[1]);
        const vNorm = normalize(mm[2]);
        if (seenSyn.has(kNorm)) continue;
        seenSyn.add(kNorm);
        const escK = kNorm.replace(/\\/g,"\\\\").replace(/"/g,'\\"');
        const escV = vNorm.replace(/\\/g,"\\\\").replace(/"/g,'\\"');
        linesOut.push(`  "${escK}": "${escV}",`);
      }
    }
  } catch (e) {
    console.warn("BOOK_SYNONYMS parse failed", e);
  }
  linesOut.push(`};`);
  linesOut.push(``);
  linesOut.push(`/**`);
  linesOut.push(` * Сопоставление названия ингредиента (как в dish.ingredients[].name) с профилем на 100г.`);
  linesOut.push(` * Порядок: точное нормализованное -> BOOK_SYNONYMS -> последовательный fallback по candidateKeys (усечение).`);
  linesOut.push(` * Read-Only, без обращения к серверу/BD.`);
  linesOut.push(` */`);
  linesOut.push(`export function getClientProfile(rawName: string): ClientNutrientProfile | null {`);
  linesOut.push(`  if (!rawName) return null;`);
  linesOut.push(`  const n = normalizeClientName(rawName);`);
  linesOut.push(`  if (!n) return null;`);
  linesOut.push(`  const direct = (CLIENT_NUTRIENT_DB as any)[n] as ClientNutrientProfile | undefined;`);
  linesOut.push(`  if (direct) return direct;`);
  linesOut.push(`  const aliasTarget = (BOOK_SYNONYMS_NORM as any)[n] as string | undefined;`);
  linesOut.push(`  if (aliasTarget) {`);
  linesOut.push(`    const viaAlias = (CLIENT_NUTRIENT_DB as any)[aliasTarget] as ClientNutrientProfile | undefined;`);
  linesOut.push(`    if (viaAlias) return viaAlias;`);
  linesOut.push(`  }`);
  linesOut.push(`  // Fallback: последовательное усечение (аналог candidateKeys без MODIFIER_WORDS) — ловит "овсяные хлопья (долгого" -> "овсяные хлопья"`);
  linesOut.push(`  const parts = n.split(/\\s+/).filter(Boolean);`);
  linesOut.push(`  for (let i = parts.length - 1; i >= 1; i--) {`);
  linesOut.push(`    const trunc = parts.slice(0, i).join(" ");`);
  linesOut.push(`    const byTrunc = (CLIENT_NUTRIENT_DB as any)[trunc] as ClientNutrientProfile | undefined;`);
  linesOut.push(`    if (byTrunc) return byTrunc;`);
  linesOut.push(`    const aliasTrunc = (BOOK_SYNONYMS_NORM as any)[trunc] as string | undefined;`);
  linesOut.push(`    if (aliasTrunc) {`);
  linesOut.push(`      const viaAliasTrunc = (CLIENT_NUTRIENT_DB as any)[aliasTrunc] as ClientNutrientProfile | undefined;`);
  linesOut.push(`      if (viaAliasTrunc) return viaAliasTrunc;`);
  linesOut.push(`    }`);
  linesOut.push(`  }`);
  linesOut.push(`  // Последнее: каждое слово как кандидат (ловит "яблоки" -> "яблоко" уже покрыто BOOK_SYNONYMS, но на всякий)`);
  linesOut.push(`  for (const w of parts) {`);
  linesOut.push(`    const byWord = (CLIENT_NUTRIENT_DB as any)[w] as ClientNutrientProfile | undefined;`);
  linesOut.push(`    if (byWord) return byWord;`);
  linesOut.push(`  }`);
  linesOut.push(`  return null;`);
  linesOut.push(`}`);
  linesOut.push(``);

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, linesOut.join("\n"), "utf-8");
  console.log(`Wrote ${OUT_PATH} (${count} profiles, ${(fs.statSync(OUT_PATH).size/1024).toFixed(1)} KB)`);
}

main();
