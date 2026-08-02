export const DAILY_VALUES: Record<string, number | null> = {
  // Макрос
  calories: 2000,
  protein: 50,
  fat: 65,
  carbohydrates: 300,
  fiber: 25,

  // Минералы
  iron: 18,
  calcium: 1300,
  magnesium: 420,
  zinc: 11,
  iodine: 150,
  potassium: 4700,
  phosphorus: 1250,
  selenium: 55,
  copper: 0.9,
  sodium: 2300,
  manganese: 2.3,

  // Витамины
  vitaminB12: 2.4,
  folate: 400,
  vitaminD: 20,
  vitaminC: 90,
  vitaminA: 900,
  vitaminE: 15,
  thiamin: 1.2,
  riboflavin: 1.3,
  niacin: 16,
  pantothenicAcid: 5,
  vitaminB6: 1.7,
  biotin: 30,
  vitaminK: 120,

  // Аминокислоты (мг на 1г белка, умножено на 50г белка = суточная норма в мг)
  leucine: 2730,
  isoleucine: 1400,
  valine: 1820,
  lysine: 2100,
  methionine: 1050,
  phenylalanine: 1750,
  threonine: 1050,
  tryptophan: 280,
  histidine: 700,

  // Жиры и сахара
  cholesterol: 300,
  saturatedFat: 20,
  transFat: null,
  omega3: 1.6,
  omega6: 17,
  omega9: null,
  fructose: null,
  glucose: null,
  lactose: null,
};

export function calcOmegaRatio(omega6: number, omega3: number): string {
  if (!omega3 || omega3 < 0.05) return "—";
  const ratio = omega6 / omega3;
  return `${ratio.toFixed(1)}:1`;
}

export function getUnit(key: string): string {
  const units: Record<string, string> = {
    calories: "ккал",
    protein: "г", fat: "г", carbohydrates: "г", fiber: "г",
    iron: "мг", calcium: "мг", magnesium: "мг", zinc: "мг",
    iodine: "мкг", potassium: "мг", phosphorus: "мг", selenium: "мкг",
    copper: "мг", sodium: "мг", manganese: "мг",
    vitaminB12: "мкг", folate: "мкг", vitaminD: "мкг", vitaminC: "мг",
    vitaminA: "мкг", vitaminE: "мг", thiamin: "мг", riboflavin: "мг",
    niacin: "мг", pantothenicAcid: "мг", vitaminB6: "мг", biotin: "мкг",
    vitaminK: "мкг",
    leucine: "мг", isoleucine: "мг", valine: "мг", lysine: "г",
    methionine: "г", phenylalanine: "мг", threonine: "мг",
    tryptophan: "мг", histidine: "мг",
    cholesterol: "мг", saturatedFat: "г", transFat: "г",
    omega3: "г", omega6: "г", omega9: "г",
    fructose: "г", glucose: "г", lactose: "г",
  };
  return units[key] || "";
}

export function getSymbol(key: string): string {
  const symbols: Record<string, string> = {
    calories: "🔥", protein: "🥩", fat: "💧", carbohydrates: "🌾", fiber: "🌿",
    omegaRatio: "⚖",
    iron: "Fe", calcium: "Ca", magnesium: "Mg", zinc: "Zn",
    iodine: "I", potassium: "K", phosphorus: "P", selenium: "Se",
    copper: "Cu", sodium: "Na", manganese: "Mn",
    vitaminB12: "B12", folate: "B9", vitaminD: "D", vitaminC: "C",
    vitaminA: "A", vitaminE: "E", thiamin: "B1", riboflavin: "B2",
    niacin: "B3", pantothenicAcid: "B5", vitaminB6: "B6", biotin: "B7",
    vitaminK: "K",
    leucine: "Leu", isoleucine: "Ile", valine: "Val", lysine: "Lys",
    methionine: "Met", phenylalanine: "Phe", threonine: "Thr",
    tryptophan: "Trp", histidine: "His",
    cholesterol: "Chol", saturatedFat: "Sat", transFat: "Trans",
    omega3: "ω‑3", omega6: "ω‑6", omega9: "ω‑9",
    fructose: "Fru", glucose: "Glc", lactose: "Lac",
  };
  return symbols[key] || "";
}

export function getLabel(key: string): string {
  const labels: Record<string, string> = {
    calories: "Калорийность", protein: "Белки", fat: "Жиры",
    carbohydrates: "Углеводы", fiber: "Клетчатка",
    omegaRatio: "Омега 6:3",
    iron: "Железо", calcium: "Кальций", magnesium: "Магний",
    zinc: "Цинк", iodine: "Йод", potassium: "Калий",
    phosphorus: "Фосфор", selenium: "Селен", copper: "Медь",
    sodium: "Натрий", manganese: "Марганец",
    vitaminB12: "Витамин B12", folate: "Фолаты (B9)",
    vitaminD: "Витамин D", vitaminC: "Витамин C",
    vitaminA: "Витамин A", vitaminE: "Витамин E",
    thiamin: "Тиамин (B1)", riboflavin: "Рибофлавин (B2)",
    niacin: "Ниацин (B3)", pantothenicAcid: "Пантотеновая к-та (B5)",
    vitaminB6: "Витамин B6",
    leucine: "Лейцин", isoleucine: "Изолейцин", valine: "Валин",
    lysine: "Лизин", methionine: "Метионин",
    phenylalanine: "Фенилаланин", threonine: "Треонин",
    tryptophan: "Триптофан", histidine: "Гистидин",
    cholesterol: "Холестерин", saturatedFat: "Насыщенные жиры",
    transFat: "Трансжиры", omega3: "Омега-3",
    omega6: "Омега-6", omega9: "Омега-9",
    fructose: "Фруктоза", glucose: "Глюкоза", lactose: "Лактоза",
  };
  return labels[key] || key;
}

export function getWarningKeys(): Set<string> {
  return new Set(["cholesterol", "saturatedFat", "transFat"]);
}
