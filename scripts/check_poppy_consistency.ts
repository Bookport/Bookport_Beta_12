/**
 * Read-only consistency checker for «семена мака» (fdcId 171330).
 * Uses the ACTUAL CSV header (validated against Prisma DMMF), never a
 * duplicated constant. Verifies header <-> DB correspondence, unique
 * nameRu/fdcId, wfpbStatus, finite nutrient fields, unknown-not-zero markers,
 * and CSV row == DB row (id/createdAt/66 fields). Never writes.
 */
import { prisma } from "../src/prisma";
import { Prisma } from "@prisma/client";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const CSV_PATH = fileURLToPath(new URL("../NAShA-BAZA_FULL_NUTRIENTS_FIXED.csv", import.meta.url));
const NAME_RU = "семена мака";
const FDC_ID = 171330;
const META_ORDER = ["id", "fdcId", "nameRu", "nameEn", "wfpbStatus", "createdAt"];
const UNKNOWN_NOT_ZERO = ["iodine", "biotin", "vitaminD2", "vitaminD3"];

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

const failures: string[] = [];
const ok = (m: string) => console.log("  PASS:", m);
const fail = (m: string) => { failures.push(m); console.error("  FAIL:", m); };
const assert = (c: boolean, m: string) => (c ? ok(m) : fail(m));

async function main() {
  // ---- DB ----
  const nameRuCount = await prisma.foodItem.count({ where: { nameRu: NAME_RU } });
  const fdcCount = await prisma.foodItem.count({ where: { fdcId: FDC_ID } });
  assert(nameRuCount === 1, `nameRu unique (count=${nameRuCount})`);
  assert(fdcCount === 1, `fdcId=${FDC_ID} unique-by-convention (count=${fdcCount})`);

  const row = await prisma.foodItem.findUnique({ where: { nameRu: NAME_RU } });
  assert(!!row, "DB row exists");
  if (!row) { console.error("Abort: no DB row."); process.exit(1); }
  assert(row.wfpbStatus === "green", "wfpbStatus == green");

  const scalar = getFoodItemScalarFields();
  const metaSet = new Set(META_ORDER);
  const nutrientSet = scalar.filter((f) => !metaSet.has(f));
  assert(
    nutrientSet.every((k) => typeof row[k] === "number" && Number.isFinite(row[k])),
    `all ${nutrientSet.length} FoodItem nutrient fields numeric & finite`
  );
  assert(
    UNKNOWN_NOT_ZERO.every((k) => row[k] === 0),
    `unknown-not-zero as 0: ${UNKNOWN_NOT_ZERO.join(", ")} (absent in FDC 171330, not verified zeros)`
  );

  // ---- CSV header <-> DMMF ----
  const raw = fs.readFileSync(CSV_PATH, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const parts = raw.split(eol);
  if (parts.length && parts[parts.length - 1] === "") parts.pop();
  const header = parseCSVLine(parts[0]);

  const headerSet = new Set(header);
  const nutrientSetS = new Set(nutrientSet);
  const diffA = header.filter((c) => !metaSet.has(c) && !nutrientSetS.has(c));
  const diffB = nutrientSet.filter((c) => !headerSet.has(c));
  const metaOk = META_ORDER.every((m, i) => header[i] === m);
  assert(diffA.length === 0, `no CSV columns absent from FoodItem/meta${diffA.length ? " (" + diffA.join(",") + ")" : ""}`);
  assert(diffB.length === 0, `no FoodItem nutrient columns absent from CSV${diffB.length ? " (" + diffB.join(",") + ")" : ""}`);
  assert(metaOk, "CSV header starts with meta order id,fdcId,nameRu,nameEn,wfpbStatus,createdAt");
  assert(header.length === 6 + nutrientSet.length, `CSV columns = 6 meta + ${nutrientSet.length} nutrients (${header.length})`);

  // ---- CSV rows ----
  const targets: string[][] = [];
  let rowColsOk = true;
  for (let i = 1; i < parts.length; i++) {
    if (!parts[i].trim()) continue;
    const f = parseCSVLine(parts[i]);
    if (f.length !== header.length) rowColsOk = false;
    if (f.length >= 3 && f[1] === String(FDC_ID) && f[2] === NAME_RU) targets.push(f);
  }
  assert(rowColsOk, "every CSV row has exactly header.length columns");
  assert(targets.length === 1, `exactly one CSV target row (found=${targets.length})`);
  if (targets.length !== 1) { console.error("Abort: CSV target rows != 1."); process.exit(1); }

  const csv = targets[0];
  const idx = (c: string) => header.indexOf(c);
  assert(csv[idx("id")] === row.id, "CSV id == DB id");
  assert(csv[idx("fdcId")] === String(FDC_ID) && csv[idx("nameRu")] === NAME_RU, "CSV fdcId/nameRu match");
  assert(csv[idx("nameEn")] === row.nameEn && csv[idx("wfpbStatus")] === "green", "CSV nameEn/wfpbStatus match");
  const csvDate = new Date(csv[idx("createdAt")].replace(" ", "T") + "Z");
  assert(Math.abs(csvDate.getTime() - (row.createdAt as Date).getTime()) < 1000, "CSV createdAt matches DB");

  const mismatch = nutrientSet.filter((k) => Number(csv[idx(k)]) !== row[k]);
  assert(
    mismatch.length === 0,
    `all ${nutrientSet.length} CSV nutrient values match DB${mismatch.length ? " (" + mismatch.join(",") + ")" : ""}`
  );

  if (failures.length) {
    console.error(`\nCHECK FAILED: ${failures.length} problem(s)`);
    process.exit(1);
  }
  console.log("\nALL CHECKS PASSED");
  await prisma.$disconnect();
}

main().catch((err) => { console.error("Fatal:", (err as Error).message); process.exit(1); });