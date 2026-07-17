export interface BookRecipeRef {
  type: "compliment" | "breakfast" | "lunch" | "dinner" | "recipe_of_day" | "must_have" | "drinks";
  id: number;
  technicalName: string;
  emotionalName?: string;
}

export interface SavedDish {
  id: string;
  name: string;
  time: string;
  tag: string;
  category: string;
  categoryColor?: string;
  image: string;
  isFavorite?: boolean;
  isNew?: boolean;
  dayIndex?: number;
  createdAt: string;
  ingredients: { name: string; weight: string; status: "green" | "yellow" | "red"; manuallyAllowed?: boolean }[];
  calories: number;
  protein: string;
  fiber: string;
  fat: string;
  annaTip: string;
  computedNutrients?: {
    calories: number;
    protein: string;
    fiber: string;
    fat: string;
  };
  annaComment?: string;
  isMixerGenerated?: boolean;
  isBookRecipe?: boolean;
  bookRecipeRef?: BookRecipeRef;
}
