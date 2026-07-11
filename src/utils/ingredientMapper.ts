const dopuskImages = import.meta.glob("/src/assets/ingredients/dopusk/*.{webp,png}", { eager: true });
const zapretImages = import.meta.glob("/src/assets/ingredients/zapret/*.{webp,png}", { eager: true });
import { getIngredientAlias } from "./ingredientAliasMapper";

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.(webp|png)$/i, "")
    .replace(/_*результат$/i, "")
    .replace(/\)+$/, "")
    .replace(/_+$/, "")
    .replace(/[_\s]+/g, " ")
    .replace(/ё/g, "е")
    .trim();
}

const ALIASES: Record<string, string> = {
  // Plural → singular (dopusk)
  "помидоры": "помидор",
  "лимоны": "лимон",
  "яблоки": "яблоко",
  "огурцы": "огурец",
  "апельсины": "апельсин",
  "бананы": "банан",
  "груши": "груша",
  "острый перец": "острый перец (чили)",

  // Generic meat/fish (zapret)
  "говядина": "стейк (сырой)",
  "свинина": "стейк (сырой)",
  "баранина": "стейк (сырой)",
  "мясо": "стейк (сырой)",
  "курица": "куриная грудка",
  "куриное филе": "куриная грудка",
  "курица жареная": "курица гриль",
  "утка": "куриная грудка",
  "индейка": "индейка",
  "лосось": "лосось",
  "семга": "лосось",
  "форель": "лосось",
  "рыба": "рыба",
  "рыбное филе": "рыба",

  // Generic zapret keywords
  "масло": "масло растительное",
  "растительное масло": "масло растительное",
  "сливочное масло": "сливочное масло",
  "сыр": "твёрдый сыр",
  "яйцо": "яйцо сырое",
  "яйца": "яйцо сырое",
  "молоко": "молоко",
  "сливки": "молоко",
  "сметана": "сметана",
  "творог": "творог",
  "майонез": "майонез",
  "сахар": "сахар",
  "соль": "соль",
  "кальмары": "кольца кальмара",
  "консервы": "консервы рыбные",
  "фарш": "фарш мясной",
  "яичница": "яичница-глазунья",

  // Generic dopusk terms
  "капуста": "капуста белокочанная",
  "зелень": "петрушка",
  "фрукты": "яблоко",
  "овощи": "помидор",
  "орехи": "грецкие орехи",

  // --- ИНВЕРСИИ ДЛЯ ЗАПРЕЩЕНКИ (ZAPRET) ---
  "стейк": "стейк (сырой)",
  "сыр плавленый": "плавленый сыр",
  "масло сливочное": "сливочное масло",
  "масло оливковое": "растительное масло",
  "масло кокосовое": "растительное масло",
  "фарш мясной": "фарш мясной",
  "хлеб белый": "белый хлеб",
  "мука белая": "белая мука",
  "мука пшеничная": "белая мука",
  "шоколад молочный": "шоколад",

  // --- ИНВЕРСИИ ДЛЯ ДОПУСКОВ (DOPUSK) ---
  "лук зеленый": "зеленый лук",
  "лук репчатый": "лук репчатый",
  "перец болгарский": "болгарский перец",
  "перец сладкий": "болгарский перец",
  "перец острый": "острый перец (чили)",
  "гречка зеленая": "зеленая гречка",
  "горох зеленый": "горох зеленый",
  "капуста цветная": "цветная капуста",
  "хлопья овсяные": "овсяные хлопья",
  "паста мисо": "мисо-паста",
  "уксус": "яблочный уксус",
  "уксус яблочный": "яблочный уксус",
  "бальзамический уксус": "уксус бальзамический",
  "лист лавровый": "лавровый лист",
  "орехи грецкие": "грецкие орехи",
  "семечки тыквенные": "тыквенные семечки",
};

const imageMap: Record<string, string> = {};

for (const [filePath, mod] of Object.entries({ ...dopuskImages, ...zapretImages })) {
  const basename = filePath.split("/").pop()!;
  const key = normalize(basename);
  imageMap[key] = (mod as { default: string }).default;
}

export function getIngredientImage(name: string): string | null {
  if (!name) return null;

  // 1. Try the original name first (preserves specific images for compound names)
  const rawKey = normalize(name);
  if (imageMap[rawKey]) return imageMap[rawKey];
  const rawAliased = ALIASES[rawKey];
  if (rawAliased) {
    const aliasKey = normalize(rawAliased);
    if (imageMap[aliasKey]) return imageMap[aliasKey];
  }

  // 2. Fallback to alias mapper (handles "жареная курица" → "куриная грудка")
  const resolved = getIngredientAlias(name);
  if (resolved !== name) {
    const resolvedKey = normalize(resolved);
    if (imageMap[resolvedKey]) return imageMap[resolvedKey];
    const aliased2 = ALIASES[resolved];
    if (aliased2) {
      const aliasKey2 = normalize(aliased2);
      if (imageMap[aliasKey2]) return imageMap[aliasKey2];
    }
  }

  return null;
}
