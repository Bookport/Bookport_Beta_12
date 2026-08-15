import { breakfastBackData } from "../data/breakfast_back";
import { lunchBackData } from "../data/lunch_back";
import { dinnerBackData } from "../data/dinner_back";
import { mustHaveBackData } from "../data/must_have_back";
import { recipeDayBackData } from "../data/recipe_day_back";
import { complimentsBackData } from "../data/compliments_back";

export const getBookMacros = (type: string, id: number): { calories: number; protein: string; fiber: string; fat: string; carbohydrates: number | null } => {
  const backDataMap: Record<string, { id: string; kbju: string[] }[]> = {
    breakfast: breakfastBackData,
    lunch: lunchBackData,
    dinner: dinnerBackData,
    must_have: mustHaveBackData,
    recipe_of_day: recipeDayBackData,
    compliment: complimentsBackData,
  };
  const entry = backDataMap[type]?.find(d => d.id === `${type}_${id}`);
  if (!entry?.kbju) return { calories: 0, protein: "", fiber: "", fat: "", carbohydrates: null };

  let calories = 0, protein = "", fiber = "", fat = "";
  // B3.0.1: углеводы возвращаем числом. null = в kbju нет строки углеводов
  // (не фабрикуем 0, чтобы строгий агрегатор корректно исключил неполную запись).
  let carbohydrates: number | null = null;
  for (const line of entry.kbju) {
    const clean = line.replace(/[;.]/g, "").replace(",", ".");
    const kcalMatch = clean.match(/калорийность:\s*([\d.]+)/i);
    if (kcalMatch) calories = Math.round(parseFloat(kcalMatch[1]));
    const protMatch = clean.match(/белок:\s*([\d.]+)/i);
    if (protMatch) protein = `${protMatch[1]} г`;
    const fatMatch = clean.match(/жиры?:\s*([\d.]+)/i);
    if (fatMatch) fat = `${fatMatch[1]} г`;
    const fiberMatch = clean.match(/клетчатк[ау]:\s*([\d.]+)/i);
    if (fiberMatch) fiber = `${fiberMatch[1]} г`;
    // Углеводы парсим из ИСХОДНОЙ строки (без общего clean, который срезает точку),
    // корректно сохраняя десятичные и с запятой ("94,1"), и с точкой ("97.2").
    const carbNumMatch = line.match(/углеводы:\s*(\d+(?:[.,]\d+)?)/i);
    if (carbNumMatch) {
      const parsed = parseFloat(carbNumMatch[1].replace(",", "."));
      if (Number.isFinite(parsed)) carbohydrates = parsed;
    }
  }
  return { calories, protein, fiber, fat, carbohydrates };
};
