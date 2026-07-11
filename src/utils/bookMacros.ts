import { breakfastBackData } from "../data/breakfast_back";
import { lunchBackData } from "../data/lunch_back";
import { dinnerBackData } from "../data/dinner_back";
import { mustHaveBackData } from "../data/must_have_back";
import { recipeDayBackData } from "../data/recipe_day_back";
import { complimentsBackData } from "../data/compliments_back";

export const getBookMacros = (type: string, id: number): { calories: number; protein: string; fiber: string; fat: string; carbohydrates: string } => {
  const backDataMap: Record<string, { id: string; kbju: string[] }[]> = {
    breakfast: breakfastBackData,
    lunch: lunchBackData,
    dinner: dinnerBackData,
    must_have: mustHaveBackData,
    recipe_of_day: recipeDayBackData,
    compliment: complimentsBackData,
  };
  const entry = backDataMap[type]?.find(d => d.id === `${type}_${id}`);
  if (!entry?.kbju) return { calories: 0, protein: "", fiber: "", fat: "", carbohydrates: "" };

  let calories = 0, protein = "", fiber = "", fat = "", carbohydrates = "";
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
    const carbMatch = clean.match(/углеводы:\s*([\d.]+)/i);
    if (carbMatch) carbohydrates = `${carbMatch[1]} г`;
  }
  return { calories, protein, fiber, fat, carbohydrates };
};
