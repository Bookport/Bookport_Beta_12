const images = import.meta.glob("/src/assets/images/recipes/*.webp", { eager: true });

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[,“\"\'\.\!\?\-\(\)«»]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

const imageMap: Record<string, string> = {};
for (const [filePath, mod] of Object.entries(images)) {
  const basename = filePath.split("/").pop()!.replace(/\.webp$/i, "");
  const key = normalize(basename);
  imageMap[key] = (mod as { default: string }).default;
}

export function getRecipeImagePath(emotionalName?: string, technicalName?: string): string | null {
  const name = emotionalName || technicalName;
  if (!name) return null;
  const key = normalize(name);
  const result = imageMap[key] ?? null;
  if (!result) {
    console.log("[recipeImageMapper] NO IMAGE for", { emotionalName, technicalName, key });
  }
  return result;
}

export function hasRecipeImage(emotionalName?: string, technicalName?: string): boolean {
  const name = emotionalName || technicalName;
  if (!name) return false;
  const key = normalize(name);
  return key in imageMap;
}

if (typeof window !== "undefined") {
  console.log("[recipeImageMapper] loaded", Object.keys(imageMap).length, "images");
  const testKeys = ["анины_бусы", "piccante", "имбирный_заряд", "ясность"];
  for (const tk of testKeys) {
    console.log("[recipeImageMapper] test key", tk, "=>", imageMap[tk] ? "FOUND" : "MISSING");
  }
}
