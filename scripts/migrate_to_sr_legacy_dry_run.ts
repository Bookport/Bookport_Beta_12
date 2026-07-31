import fs from "node:fs/promises";
import { parse } from "csv-parse/sync";

type Row = {
  id?: string;
  fdcId?: string;
  nameRu?: string;
  nameEn?: string;
  wfpbStatus?: string;
};

const raw = await fs.readFile("BASE.csv", "utf8");
const rows = parse(raw, { columns: true, skip_empty_lines: true }) as Row[];

const results = rows.map((r) => ({
  id: r.id?.trim() || "",
  fdcId: r.fdcId?.trim() || "",
  nameRu: r.nameRu?.trim() || "",
  nameEn: r.nameEn?.trim() || "",
  wfpbStatus: r.wfpbStatus?.trim() || "",
}));

const headers = ["id", "fdcId", "nameRu", "nameEn", "wfpbStatus"] as const;

const escapeCsv = (value: string) => {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
};

const csv = [
  headers.join(","),
  ...results.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
].join("\n");

await fs.writeFile("BASE_FIXED.csv", csv, "utf8");

console.log("rows:", rows.length);
console.log("written:", results.length);
console.log("file:", "BASE_FIXED.csv");