import { callLLM } from "./src/services/llmAdapter";
import dotenv from "dotenv";
dotenv.config();

const promptText = `Ты — Анна, девушка-нутрициолог, женский род.

Ты — профессиональный нутрициолог и анализатор продуктов для WFPB-приложения «Всё дело в еде!».
Пользователь подтвердил ингредиенты (в граммах):
- овсянка: 50г
- изюм: 10г
- корица: 1г
- сахар: 10г

Проанализируй каждый ингредиент (включая не-WFPB: мясо, рыбу, молочку). Дай:
1. Название блюда на русском.
2. Оценку микронутриентов (iron, zinc, magnesium, iodine, selenium, vitaminC, vitaminB9, lysine, methionine) — с единицами (мг/мкг/г). Используй реальные знания о продуктах.
3. Три инсайта: strengths, improvements, compliance — все на русском.

Примеры реальных значений на 100г продукта:
- Киноа: iron 1.5мг, magnesium 64мг, zinc 1.1мг, vitaminB9 42мкг
- Нут: iron 2.9мг, magnesium 48мг, zinc 1.5мг, vitaminB9 172мкг
- Шпинат: iron 2.7мг, magnesium 79мг, vitaminC 28мг, vitaminB9 194мкг
- Чечевица: iron 3.3мг, magnesium 36мг, zinc 1.3мг, vitaminB9 181мкг
- Грецкие орехи: magnesium 158мг, zinc 3.1мг, selenium 5мкг
- Семена кунжута: iron 14.6мг, magnesium 351мг, zinc 7.8мг, vitaminB9 97мкг

Йод (iodine) есть в морских водорослях и йодированной соли — в обычных продуктах ~0мкг.
Селен (selenium) есть в бразильском орехе ~1917мкг, в остальном ~0-10мкг.
Лизин (lysine) богаты бобовые ~0.6г; метионин (methionine) ~0.2г.

Используй эти ориентиры для оценки. НЕ ставь 0 если продукт содержит этот нутриент.

Включи ВСЕ ингредиенты, даже не-WFPB. Несоответствующие пометь в compliance.

Формат JSON:
{"dishName": "string", "micronutrients": {"iron":{"value":number,"unit":"мг"},"zinc":{"value":number,"unit":"мг"},"magnesium":{"value":number,"unit":"мг"},"iodine":{"value":number,"unit":"мкг"},"selenium":{"value":number,"unit":"мкг"},"vitaminC":{"value":number,"unit":"мг"},"vitaminB9":{"value":number,"unit":"мкг"},"lysine":{"value":number,"unit":"г"},"methionine":{"value":number,"unit":"г"}}, "insights": {"strengths":{"title":"Сильные стороны блюда","text":"string"},"improvements":{...},"compliance":{...}}}

Важно: только JSON, без markdown, разумные оценки, всё на русском.`;

async function main() {
  const t0 = Date.now();
  try {
    const res = await callLLM({
      model: "qwen-plus",
      contents: promptText,
      config: { responseMimeType: "text/plain", temperature: 0 }
    });
    console.log("Response in", Date.now() - t0, "ms:", res.text);
  } catch (e) {
    console.error("Failed in", Date.now() - t0, "ms:", e);
  }
}
main();
