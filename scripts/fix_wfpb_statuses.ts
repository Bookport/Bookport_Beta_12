import "dotenv/config";
import fs from "node:fs/promises";
import { prisma } from "../src/prisma";

const toGreen = [
  "зеленый горошек замороженный",
  "кокосовые сливки",
  "корень сельдерея",
  "порошок сельдерея",
  "сельдерей",
  "сельдерей корневой очищенный",
  "крапива",
  "светло-красная рукола",
  "тофу запеченный",
  "тофу копченый",
  "финиковая паста",
];

const toForbidden = [
  "Баклажан солён./марин.",
  "Вино белое",
  "Вино красное",
  "Вино сухое",
  "Огурец солёный, квашеный",
  "Огурец солёный, кошерный",
  "Пиво все вар.",
  "Помидор тушёный с солью",
  "Пшеничная мука отбел., пром., бел.",
  "Свекла солён./марин.",
  "Соевый сыр (тофу) солёный, ферментированный",
  "Соль столовая",
  "Шоколад молочный",
];

const normalize = (t: string): string =>
  (t || "").toLowerCase().replace(/ё/g, "е").trim();

async function updateDB() {
  let updated = 0;
  for (const name of toGreen) {
    const res = await prisma.foodItem.updateMany({
      where: { nameRu: { equals: name, mode: "insensitive" } },
      data: { wfpbStatus: "green" },
    });
    updated += res.count;
  }
  for (const name of toForbidden) {
    const res = await prisma.foodItem.updateMany({
      where: { nameRu: { equals: name, mode: "insensitive" } },
      data: { wfpbStatus: "forbidden" },
    });
    updated += res.count;
  }
  console.log(`[DB] updated rows: ${updated}`);
}

// ── CSV: минимальный перезапись строк, у которых меняется 5-я колонка ──
function tokenize(line: string): { value: string; start: number; end: number }[] {
  const fields: { value: string; start: number; end: number }[] = [];
  let i = 0;
  const len = line.length;
  while (i < len) {
    const start = i;
    let inQuotes = false;
    if (line[i] === '"') {
      inQuotes = true;
      i++;
    }
    let buf = "";
    while (i < len) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            buf += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        buf += ch;
        i++;
      } else {
        if (ch === ",") break;
        buf += ch;
        i++;
      }
    }
    fields.push({ value: buf, start, end: i });
    if (i < len && line[i] === ",") i++;
  }
  return fields;
}

async function updateCSV() {
  const file = "NAShA-BAZA_FULL_NUTRIENTS_FIXED.csv";
  const raw = await fs.readFile(file, "utf8");
  const lines = raw.split("\n");
  let changed = 0;
  const targets = new Map<string, string>();
  toGreen.forEach((n) => targets.set(normalize(n), "green"));
  toForbidden.forEach((n) => targets.set(normalize(n), "forbidden"));

  const out = lines.map((line, idx) => {
    if (idx === 0 || !line.trim()) return line;
    const fields = tokenize(line);
    if (fields.length < 5) return line;
    const nameRu = normalize(fields[2].value);
    const wanted = targets.get(nameRu);
    if (!wanted || normalize(fields[4].value) === wanted) return line;
    const f = fields[4];
    changed++;
    return (
      line.slice(0, f.start) + `"${wanted}"` + line.slice(f.end)
    );
  });
  await fs.writeFile(file, out.join("\n"), "utf8");
  console.log(`[CSV] updated rows: ${changed}`);
}

await updateDB();
await updateCSV();
await prisma.$disconnect();
