import { checkWFPB } from "../src/utils/wfpbRules";
import { findForbiddenInText } from "../src/data/wfpb_forbidden_ingredients";
import { matchDBStatus } from "../src/utils/wfpbMatch";

let fails = 0;

const MUST_BE_GREEN: string[] = [
  "Мандарин сырой",
  "Сельдерей",
  "сельдерей",
  "сельдерей корневой очищенный",
  "крапива",
  "морковь",
  "кокос молоко",
  "печёный картофель",
  "винный уксус",
  "тофу копченый",
  "фасоль",
  "виноград",
  "петрушка",
  "светло-красная рукола",
];

const MUST_BE_FORBIDDEN: string[] = [
  "сыр",
  "сырный",
  "молоко",
  "соль",
  "масло сливочное",
  "селёдка",
  "сельдь",
  "шоколад молочный",
  "говядина",
  "сосиски",
];

for (const n of MUST_BE_GREEN) {
  const r = checkWFPB(n);
  if (!r.compliant) {
    fails++;
    console.log(`FAIL green: "${n}" -> ${r.violations.join(",")}`);
  }
}
for (const n of MUST_BE_FORBIDDEN) {
  const r = checkWFPB(n);
  if (r.compliant) {
    fails++;
    console.log(`FAIL forbidden: "${n}" -> compliant`);
  }
}

// Server-side regex filter must not hit the known false positives
const serverCases: [string, boolean][] = [
  ["Мандарин сырой", false],
  ["Сельдерей", false],
  ["сыр", true],
  ["сырный", true],
  ["молоко", true],
  ["селёдка", true],
];
for (const [text, expectHit] of serverCases) {
  const found = findForbiddenInText(text);
  const hit = found.length > 0;
  if (hit !== expectHit) {
    fails++;
    console.log(
      `FAIL server: "${text}" expectHit=${expectHit} got=${hit} (${found
        .map((f) => f.ingredient)
        .join(",")})`
    );
  }
}

// DB-priority integration: authoritative statuses from /api/food
try {
  const resp = await fetch("http://localhost:3001/api/food", {
    headers: {
      "x-dev-user-id": "dev-user-00000000-0000-0000-0000-000000000000",
    },
  });
  if (resp.ok) {
    const items = (await resp.json()) as { nameRu: string; wfpbStatus: string }[];
    const cases: [string, string][] = [
      ["сельдерей", "green"],
      ["Сельдерей", "green"],
      ["сельдерей корневой очищенный", "green"],
      ["тофу копченый", "green"],
      ["крапива", "green"],
      ["морковь", "green"],
      ["вино белое", "forbidden"],
      ["соль столовая", "forbidden"],
      ["салями", "forbidden"],
      ["омар", "forbidden"],
      ["морской гребешок", "forbidden"],
      ["шоколад молочный", "forbidden"],
    ];
    for (const [name, expected] of cases) {
      const got = matchDBStatus(name, items);
      if (got !== expected) {
        fails++;
        console.log(`FAIL dbStatus: "${name}" expected=${expected} got=${got}`);
      }
    }
  } else {
    console.log("SKIP dbStatus checks: /api/food unreachable");
  }
} catch {
  console.log("SKIP dbStatus checks: /api/food unreachable");
}

console.log(fails === 0 ? "ALL PASS" : `${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
