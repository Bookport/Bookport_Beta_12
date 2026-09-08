import { prisma } from "../prisma";
import {
  ANNA_RECIPE_METADATA,
  type AnnaRecipeMetadata,
} from "./annaRecipeMetadata";

export type AnnaRecipeDetails = {
  ingredients: string[] | null;
  instructions: string | null;
  kbju: unknown | null;
};

export type AnnaRecipeContext = {
  metadata: AnnaRecipeMetadata;
  details: AnnaRecipeDetails | null;
};

export type AnnaRecipeLookupResult =
  | {
      status: "found";
      recipe: AnnaRecipeContext;
      detailsLookupFailed: boolean;
    }
  | {
      status: "ambiguous";
      candidates: readonly AnnaRecipeMetadata[];
    }
  | {
      status: "not_found";
    };

function normalizeRecipeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»“”„"]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function parseJsonArray(value: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function parseJson(value: string): unknown | null {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function findExactRecipeMatches(query: string): readonly AnnaRecipeMetadata[] {
  const normalizedQuery = normalizeRecipeName(query);

  if (!normalizedQuery) {
    return [];
  }

  const matches = ANNA_RECIPE_METADATA.filter((recipe) => {
    const normalizedDisplayName = normalizeRecipeName(recipe.displayName);
    const normalizedTechnicalName = normalizeRecipeName(recipe.technicalName);

    return (
      normalizedQuery.includes(normalizedDisplayName) ||
      normalizedQuery.includes(normalizedTechnicalName)
    );
  });

  return matches.filter(
    (recipe, index) =>
      matches.findIndex(
        (candidate) =>
          candidate.type === recipe.type && candidate.id === recipe.id,
      ) === index,
  );
}

export async function lookupAnnaBookRecipe(
  query: string
): Promise<AnnaRecipeLookupResult> {
  const matches = findExactRecipeMatches(query);

  if (matches.length === 0) {
    return { status: "not_found" };
  }

  if (matches.length > 1) {
    return { status: "ambiguous", candidates: matches };
  }

  const metadata = matches[0];

  try {
    const recipe = await prisma.bookRecipe.findUnique({
      where: {
        type_id: {
          type: metadata.type,
          id: metadata.id,
        },
      },
    });

    if (!recipe) {
      return {
        status: "found",
        recipe: {
          metadata,
          details: null,
        },
        detailsLookupFailed: false,
      };
    }

    return {
      status: "found",
      recipe: {
        metadata,
        details: {
          ingredients: parseJsonArray(recipe.ingredients),
          instructions: recipe.instructions || null,
          kbju: parseJson(recipe.kbju),
        },
      },
      detailsLookupFailed: false,
    };
  } catch {
    return {
      status: "found",
      recipe: {
        metadata,
        details: null,
      },
      detailsLookupFailed: true,
    };
  }
}