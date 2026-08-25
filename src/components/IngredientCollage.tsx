import React from "react";
import { getIngredientImage } from "../utils/ingredientMapper";
import { getIngredientAlias } from "../utils/ingredientAliasMapper";

interface IngredientCollageProps {
  ingredients?: { name: string; weight?: string; status?: string }[];
  className?: string;
  containerHeight?: string;
  /** 'default' — прежний режим (ячейки с обрезкой); 'freeform' — прозрачная композиция без клипа ячеек */
  variant?: "default" | "freeform";
}

function getImages(ingredients: { name: string }[]): string[] {
  return ingredients
    .map((ing) => getIngredientImage(getIngredientAlias(ing.name)))
    .filter((url): url is string => url !== null && url !== undefined);
}

export default function IngredientCollage({
  ingredients,
  className = "",
  containerHeight = "h-full",
  variant = "default",
}: IngredientCollageProps) {
  if (!ingredients || ingredients.length === 0) {
    return (
      <div className={`w-full ${containerHeight} flex items-center justify-center text-4xl bg-gray-100 ${className}`}>
        🍽
      </div>
    );
  }

  const urls = getImages(ingredients);

  if (urls.length === 0) {
    return (
      <div className={`w-full ${containerHeight} flex items-center justify-center text-4xl bg-gray-100 ${className}`}>
        🍽
      </div>
    );
  }

  const N = urls.length;
  const baseOverlap = N <= 2 ? 20 : (N <= 4 ? 15 : 10);
  const itemWidth = ((100 + baseOverlap * (N - 1)) / N).toFixed(1);
  const step = parseFloat(itemWidth) - baseOverlap;

  const freeform = variant === "freeform";

  return (
    <div className={`w-full ${containerHeight} overflow-hidden relative ${className}`}>
      {urls.map((url, i) => (
        <div
          key={i}
          className={`absolute top-0 h-full ${freeform ? "" : "overflow-hidden"}`}
          style={{
            width: `${itemWidth}%`,
            left: `${i * step}%`,
            zIndex: i,
          }}
        >
          <img
            src={url}
            alt=""
            className={`w-full h-full ${freeform ? "object-contain" : "object-cover"}`}
          />
        </div>
      ))}
    </div>
  );
}
