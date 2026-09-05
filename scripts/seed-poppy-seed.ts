/**
 * Recoverable idempotent two-store writer for «семена мака» (USDA FDC 171330,
 * SR Legacy "Spices, poppy seed").
 *
 * NOT a cross-store transaction and NOT rollback-safe: it is a recoverable
 * idempotent two-store write — (1) DB upsert, (2) atomic replace of the CSV
 * row. If (2) fails after the DB commit, re-run this script to recover
 * (everything is re-derived from the DB row).
 *
 * Source of truth for the CSV layout is the ACTUAL header of
 * NAShA-BAZA_FULL_NUTRIENTS_FIXED.csv, validated against Prisma DMMF — NOT a
 * locally hardcoded column list.
 *
 * Omega mapping (deliberate semantic mapping; scripts/enrich-nutrients.ts is
 * intentionally NOT changed, other FoodItems are NOT touched):
 *   omega3 = 0.273  (PUFA 18:3 n-3, ALA)          FDC id 1270
 *   omega6 = 28.295 (PUFA 18:2 n-6, linoleic)     FDC id 1269
 *   omega9 = 5.717  (oleic acid)                  FDC id 1081
 *
 * unknown-not-zero (0 ONLY because of the Prisma schema @default(0); the
 * nutrient is ABSENT from USDA record 171330, not a verified zero):
 *   iodine, biotin, vitaminD2, vitaminD3
 *
 * Temp safety: if ${CSV_PATH}.tmp exists, the normal run aborts before the DB
 * upsert and before any file changes (it is never read fully, deleted, or
 * overwritten). Deliberate recovery = --recover-stale-tmp: prints absolute
 * path/mtime/size and the first two lines, archives the stale tmp to a unique
 * ${CSV_PATH}.tmp.recovered-YYYYMMDDTHHMMSSmmmZ (COPY, not rename), fsyncs and
 * verifies the archive copy (exists + size match), and only then removes the
 * original stale tmp; afterwards the normal flow proceeds (header validation →
 * DB upsert → fresh tmp → atomic rename). If archive/verify/remove fails it
 * aborts BEFORE the DB upsert, leaves the stale tmp untouched, and does not
 * create a new temp file.
 */
import { prisma } from "../src/prisma";
import { Prisma } from "@prisma/client";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const CSV_PATH = fileURLToPath(new URL("../NAShA-BAZA_FULL_NUTRIENTS_FIXED.csv", import.meta.url));
const TMP_PATH = `${CSV_PATH}.tmp`;
const NAME_RU = "семена мака";
const FDC_ID = 171330;
const RECOVER = process.argv.includes("--recover-stale-tmp");

const META_ORDER = ["id", "fdcId", "nameRu", "nameEn", "wfpbStatus", "createdAt"];

// All 66 nutrient fields, values per 100 g (USDA FDC 171330).
const data = {
  fdcId: FDC_ID,
  nameRu: NAME_RU,
  nameEn: "Spices, poppy seed",
  wfpbStatus: "green",
  calories: 525, protein: 17.99, fat: 41.56, carbohydrates: 28.13, water: 5.95, fiber: 19.5,
  sugarTotal: 2.99, sucrose: 2.33, glucose: 0.37, fructose: 0.29, lactose: 0, maltose: 0,
  saturatedFat: 4.517, monounsaturatedFat: 5.982, polyunsaturatedFat: 28.569,
  transFat: 0, cholesterol: 0,
  omega3: 0.273, omega6: 28.295, omega9: 5.717,
  calcium: 1438, iron: 9.76, magnesium: 347, phosphorus: 870, potassium: 719, sodium: 26,
  zinc: 7.9, copper: 1.627, manganese: 6.707,
  iodine: 0,           // unknown-not-zero (absent in FDC 171330)
  selenium: 13.5,
  vitaminC: 1, thiamin: 0.854, riboflavin: 0.1, niacin: 0.896, pantothenicAcid: 0.324,
  vitaminB6: 0.247,
  biotin: 0,           // unknown-not-zero
  folate: 82, vitaminB12: 0,
  vitaminA: 0, retinol: 0, betaCarotene: 0, vitaminD: 0,
  vitaminE: 1.77, vitaminK: 0,
  lysine: 0.952, methionine: 0.502, tryptophan: 0.184, threonine: 0.686, isoleucine: 0.819,
  leucine: 1.321, cystine: 0.297, phenylalanine: 0.758, tyrosine: 0.727, valine: 1.095,
  arginine: 1.945, histidine: 0.471, alanine: 0.839, asparticAcid: 2.365,
  glutamicAcid: 4.299, glycine: 0.952, proline: 2.754, serine: 0.952,
  vitaminD2: 0,        // unknown-not-zero
  vitaminD3: 0,        // unknown-not-zero
};

function getFoodItemScalarFields(): string[] {
  const dmmf = (Prisma as any).dmmf;
  const model = (dmmf?.datamodel?.models || []).find((m: any) => m.name === "FoodItem");
  if (!model) throw new Error("FoodItem model not found in Prisma DMMF");
  return model.fields.map((f: any) => f.name);
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function serializeCSVLine(fields: (string | number)[]): string {
  return fields
    .map((f) => (typeof f === "number" ? String(f) : `"${String(f).replace(/"/g, '""')}"`))
    .join(",");
}

function formatCreatedAtUTC(d: Date): string {
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}.${p(d.getUTCMilliseconds(), 3)}`;
}

// Controlled recovery of a stale tmp. Normal run aborts; --recover-stale-tmp
// archives (copy, not rename), verifies, then deletes the stale tmp, then the
// normal flow re-creates a fresh tmp for the atomic CSV replace.
function recoverStaleTmp(): void {
  if (!fs.existsSync(TMP_PATH)) return;

  const st = fs.statSync(TMP_PATH);
  console.log(`[recover] stale tmp path=${TMP_PATH} mtime=${st.mtime.toISOString()} size=${st.size} bytes`);
  const head = fs.readFileSync(TMP_PATH, "utf8").split("\n").slice(0, 2).join(" | ");
  console.log(`[recover] head: ${head}`);

  if (!RECOVER) {
    throw new Error(
      `Stale tmp exists: ${TMP_PATH}. Refusing to write. ` +
      `Inspect, then re-run with --recover-stale-tmp (never auto-deleted).`
    );
  }

  // 1) Unique archive copy NEXT TO the stale tmp (copy, not rename).
  const stamp = new Date().toISOString().replace(/[-:.]/g, ""); // YYYYMMDDTHHMMSSmmmZ
  const archivePath = `${TMP_PATH}.recovered-${stamp}`;

  try {
    // 2) copy, then fsync+close the archive copy (r+), then stat/verify.
    fs.copyFileSync(TMP_PATH, archivePath);
    const fd = fs.openSync(archivePath, "r+");
    try {
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    const arch = fs.statSync(archivePath);
    if (!fs.existsSync(archivePath) || arch.size !== st.size) {
      throw new Error(
        `[recover] archive verification failed for ${archivePath} ` +
        `(archSize=${arch.size}, origSize=${st.size}); stale tmp left untouched`
      );
    }
    console.log(`[recover] archived to ${archivePath} (size ${arch.size} bytes, verified)`);

    // 3) Only now remove the original stale tmp.
    fs.unlinkSync(TMP_PATH);
    console.log(`[recover] stale tmp removed; proceeding with normal write`);
  } catch (err) {
    // Archive/copy/verify failed: stale tmp is NOT deleted, the DB upsert is
    // NOT performed, and no new temp file is created. The archive (if already
    // created) is kept for manual diagnosis and is never auto-deleted.
    console.error(`[recover] FAILED; archive (if created): ${archivePath}`);
    console.error(`[recover] stale tmp left untouched: ${TMP_PATH}`);
    console.error(`[recover] ${(err as Error).message}`);
    throw err;
  }
}

// Validates the ACTUAL CSV header against FoodItem DMMF; prints diffs; aborts on mismatch.
function validateCsvHeader(): { header: string[]; eol: string; parts: string[]; hadTrailingEol: boolean } {
  const raw = fs.readFileSync(CSV_PATH, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const parts = raw.split(eol);
  if (parts.length && parts[parts.length - 1] === "") parts.pop();
  const header = parseCSVLine(parts[0]);

  const scalar = getFoodItemScalarFields();
  const metaSet = new Set(META_ORDER);
  const nutrientSet = new Set(scalar.filter((f) => !metaSet.has(f)));
  const headerSet = new Set(header);

  const diffA = header.filter((c) => !metaSet.has(c) && !nutrientSet.has(c));
  const diffB = [...nutrientSet].filter((c) => !headerSet.has(c));

  console.log(`[header] columns=${header.length}`);
  console.log(`[header] order=${header.join(",")}`);
  console.log(`[diffA] CSV columns absent from FoodItem/allowed-meta: ${diffA.length ? diffA.join(",") : "(none)"}`);
  console.log(`[diffB] FoodItem nutrient columns absent from CSV:      ${diffB.length ? diffB.join(",") : "(none)"}`);

  const metaOk = META_ORDER.every((m, i) => header[i] === m);
  if (diffA.length || diffB.length || !metaOk) {
    throw new Error(
      `CSV header does not match FoodItem DMMF (meta order ok=${metaOk}, diffA=${diffA.length}, diffB=${diffB.length}). Aborting before any write.`
    );
  }
  return { header, eol, parts, hadTrailingEol: raw.endsWith(eol) };
}

// Builds the CSV row strictly by the ACTUAL header, reading each column from the DB row.
function buildCsvLine(header: string[], saved: Record<string, unknown>): string {
  const fields: (string | number)[] = [];
  for (const col of header) {
    if (col === "id") fields.push(String(saved.id));
    else if (col === "fdcId") fields.push(String(saved.fdcId));
    else if (col === "nameRu") fields.push(String(saved.nameRu));
    else if (col === "nameEn") fields.push(String(saved.nameEn));
    else if (col === "wfpbStatus") fields.push(String(saved.wfpbStatus));
    else if (col === "createdAt") fields.push(formatCreatedAtUTC(saved.createdAt as Date));
    else {
      const v = saved[col];
      if (typeof v !== "number" || !Number.isFinite(v))
        throw new Error(`DB row has no numeric value for required CSV column "${col}"`);
      fields.push(v);
    }
  }
  return serializeCSVLine(fields);
}

async function main() {
  // Pre-checks BEFORE any DB write
  recoverStaleTmp();
  const { header, eol, parts, hadTrailingEol } = validateCsvHeader();

  const targetIdx: number[] = [];
  for (let i = 1; i < parts.length; i++) {
    if (!parts[i].trim()) continue;
    const f = parseCSVLine(parts[i]);
    if (f.length !== header.length)
      throw new Error(`CSV row ${i + 1} has ${f.length} cols, header ${header.length}`);
    if (f.length >= 3 && f[1] === String(FDC_ID) && f[2] === NAME_RU) targetIdx.push(i);
  }
  if (targetIdx.length > 1)
    throw new Error(`CSV contains ${targetIdx.length} target rows; aborting without writing`);

  // (1) DB upsert
  const upserted = await prisma.$transaction((tx) =>
    tx.foodItem.upsert({ where: { nameRu: NAME_RU }, create: data, update: data })
  );
  console.log(`[db] upserted id=${upserted.id}`);

  const saved = await prisma.foodItem.findUnique({ where: { nameRu: NAME_RU } });
  if (!saved) throw new Error("DB row disappeared after upsert");

  const csvLine = buildCsvLine(header, saved);

  // (2) Atomic CSV replace (temp + rename)
  try {
    if (targetIdx.length === 0) parts.push(csvLine);
    else parts[targetIdx[0]] = csvLine;
    let content = parts.join(eol);
    if (hadTrailingEol) content += eol;
    fs.writeFileSync(TMP_PATH, content, "utf8");
    fs.renameSync(TMP_PATH, CSV_PATH);
    console.log(`[csv] updated: ${targetIdx.length === 0 ? "inserted new row" : "replaced existing row"}`);
  } catch (err) {
    console.error("[csv] CSV write FAILED after DB commit — success is NOT claimed.");
    console.error("[csv] Recovery: re-run `npx tsx scripts/seed-poppy-seed.ts` (idempotent); inspect stale tmp first if present.");
    console.error(`[csv] ${(err as Error).message}`);
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((err) => { console.error("Fatal:", (err as Error).message); process.exit(1); });