import { resolveBookRecipeNutrients } from "../src/utils/bookRecipeNutrients";

async function test() {
  const result = await resolveBookRecipeNutrients("recipe_day", 23);
  console.log("Status:", result.status);
  console.log("Ingredients:", result.ingredients.length);
  
  for (const ing of result.ingredients) {
    if (ing.rawName.includes("миндальная паста")) {
      console.log("Found minдаль paste ingredient:");
      console.log("  rawName:", ing.rawName);
      console.log("  foodItemNameRu:", ing.foodItemNameRu);
      console.log("  grams:", ing.grams);
      console.log("  excluded:", ing.excluded);
      console.log("  unresolvedReason:", ing.unresolvedReason);
    }
  }
}

test().catch(console.error);