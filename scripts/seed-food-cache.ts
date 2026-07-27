import { getIngredientData } from "../src/services/FoodDataService";

const INGREDIENTS: string[] = [
  // ── Злаковая цельнозерновая мука ──
  "мука овсяная", "мука гречневая", "мука пшеничная цельнозерновая", "мука обойная", 
  "мука ржаная", "мука ржаная обдирная", "мука полбяная", "мука ячменная", "мука амарантовая",

  // ── Мука из бобовых ──
  "мука нутовая", "мука гороховая", "мука чечевичная", "мука соевая",

  // ── Ореховая и семенная мука ──
  "мука миндальная", "мука кокосовая", "мука льняная", "мука кунжутная", "мука тыквенная", "мука из грецкого ореха",

  // ── Правильный рис ──
  "рис бурый", "рис коричневый", "рис дикий", "рис красный", "рис черный", "рис нешлифованный",

  // ── Правильная паста и макароны ──
  "макароны цельнозерновые", "паста цельнозерновая", "макароны из твердых сортов пшеницы", "макароны из полбы",
  "макароны из нута", "макароны из чечевицы", "лапша гречневая", "соба", "фунчоза", "бобовая лапша",

  // ── Дополнительная клетчатка ──
  "отруби пшеничные", "отруби ржаные"
];

const BATCH_SIZE = 3;
const DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const total = INGREDIENTS.length;
  console.log(`[Seed] Starting cache seed for ${total} ingredients...\n`);

  let added = 0;
  let failed = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = INGREDIENTS.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((name) => getIngredientData(name))
    );

    for (let j = 0; j < results.length; j++) {
      const idx = i + j + 1;
      const name = batch[j];
      const r = results[j];

      if (r.status === "fulfilled" && r.value !== null) {
        added++;
        console.log(`  [${idx}/${total}] ✅ ${name} — ${r.value.calories} kcal`);
      } else {
        failed++;
        const reason = r.status === "rejected" ? r.reason?.message || "rejected" : "not found";
        console.log(`  [${idx}/${total}] ❌ ${name} — ${reason}`);
      }
    }

    if (i + BATCH_SIZE < total) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n[Seed] Done. Success: ${added}, Failed: ${failed}/${total}`);
}

main().catch((err) => {
  console.error("[Seed] Fatal error:", err);
  process.exit(1);
});
