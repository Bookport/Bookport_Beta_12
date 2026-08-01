import { normalize, resolveAgainstIndex } from "./ingredientMappingCore";

const dopuskImages = import.meta.glob("/src/assets/ingredients/dopusk/*.{webp,png}", { eager: true });
const zapretImages = import.meta.glob("/src/assets/ingredients/zapret/*.{webp,png}", { eager: true });

export { normalize };

export const imageMap: Record<string, string> = {};

for (const [filePath, mod] of Object.entries({ ...dopuskImages, ...zapretImages })) {
  const basename = filePath.split("/").pop()!;
  const key = normalize(basename);
  imageMap[key] = (mod as { default: string }).default;
}

const imageKeys = new Set(Object.keys(imageMap));

export function getIngredientImage(name: string): string | null {
  if (!name) return null;

  const key = resolveAgainstIndex(name, imageKeys);
  return key ? imageMap[key] : null;
}
