import type {
  AnnaRecipeLookupResult,
  AnnaRecipeContext,
} from "./annaRecipeLookup";

type RecipePromptNeeds = {
  page: boolean;
  day: boolean;
  ingredients: boolean;
  kbju: boolean;
  instructions: boolean;
  personalBenefit: boolean;
};

function normalizeMessage(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

function getRecipePromptNeeds(message: string): RecipePromptNeeds {
  const normalized = normalizeMessage(message);

  const page =
    /(?:на|со|с|до)\s+(?:страниц(?:е|ы|у|ах)?|стр\.?)|(?:какая|какой|номер)\s+страниц|страниц(?:а|е|ы|у|ах)?\s*(?:№|n)?\s*\d+|где\s+(?:в\s+книге\s+)?(?:найти|искать|посмотреть)\s+(?:рецепт|блюдо|его|ее)|(?:рецепт|блюдо).*(?:на\s+)?страниц/.test(
      normalized,
    );

  const day =
    /(?:какой|в\s+какой|на\s+какой|к\s+какому)\s+день|(?:на|для)\s+\d+\s*(?:й|го)?\s*день|день\s*(?:№|n)?\s*\d+|день.*(?:рецепт|блюд|книг|меню|план)|(?:рецепт|блюд|книг|меню|план).*(?:какой|каком|какому)\s+день|когда\s+(?:его|ее|это|блюдо|рецепт)\s+(?:есть|готовить|делать)|в\s+какой\s+день\s+(?:есть|готовить|делать)/.test(
      normalized,
    );

  const ingredients =
    /(?:состав|ингредиент|продукт|из\s+чего|что\s+(?:входит|нужно|понадобит(?:ся)?|клад[её]тся|содержит)|чем\s+(?:делать|готовить)|какие\s+(?:продукты|ингредиенты))|(?:есть\s+ли|содержит\s+ли|бывает\s+ли|имеется\s+ли|можно\s+ли\s+без|без).*(?:орех|арахис|миндал|фундук|кешью|пекан|фисташ|семен|кунжут|мак|глютен|пшениц|мук|сахар|подсластител|соль|масл|боб|соя|нут|чечевиц|фасол|молок|сливк|сыр|творог|лактоз|яиц|мед|шоколад|какао|желатин|агар|рыб|мяс|куриц|говядин|свинин|аллерген)|(?:орех|арахис|миндал|фундук|кешью|пекан|фисташ|семен|кунжут|мак|глютен|пшениц|мук|сахар|подсластител|соль|масл|боб|соя|нут|чечевиц|фасол|молок|сливк|сыр|творог|лактоз|яиц|мед|шоколад|какао|желатин|агар|рыб|мяс|куриц|говядин|свинин|аллерген).*(?:есть|входит|содержит|имеется|будет|нужен|нужно)/.test(
      normalized,
    );

  const kbju =
    /(?:кбжу|бжу|ккал|калори|калорийност|энергетическ\w*\s+ценност|пищевая\s+ценност|питательн\w*\s+ценност|нутриент|макрос|макронутриент|белк|протеин|protein|жир|липид|углевод|карб|carb|клетчатк|пищев\w*\s+волокн|волокн)|сколько\s+(?:калори|ккал|белк|протеин|жир|углевод|клетчатк)|(?:калори|ккал|белк|протеин|жир|углевод|клетчатк).*(?:на|в)\s+(?:порци|100\s*(?:г|гр)|сто\s*(?:грамм|гр)|одну\s+порци)/.test(
      normalized,
    );

  const instructions =
    /(?:как\s+(?:приготовить|готовить|сделать|делать|варить|запечь|выпечь|жарить|собрать))|(?:приготовить|готовить|сделать|делать|варить|запечь|выпечь|жарить|собрать)\s+(?:рецепт|блюд|это|его|ее)|инструкц|пошагов|шаг[аи]|этап|способ\s+(?:приготовления|готовки)|технологи[яи]\s+(?:приготовления|готовки)|рецепт\s+(?:приготовления|как\s+готовить)|что\s+(?:делать|делать\s+дальше)|с\s+чего\s+начать|в\s+какой\s+последовательност|сколько\s+(?:варить|запекать|выпекать|жарить|готовить|держать)|(?:температур|градус|духовк|сковород|блендер|взбить|смешать|нарезать|замочить|охладить|остудить|поставить\s+в\s+холодильник).*(?:как|сколько|нужно|надо|время|минут|градус)/.test(
      normalized,
    );

  const personalBenefit =
    /(?:чем\s+(?:мне\s+)?полез(?:ен|на|ны|но|ного|ных)?|полез(?:ен|на|ны|но|ного|ных)?.*(?:мне|для\s+меня|для\s+организм))|(?:подойдет|подходит|можно\s+ли|стоит\s+ли|нужно\s+ли).*(?:мне|для\s+меня|при\s+(?:похудени|снижен(?:ии|ие)\s+веса|набор(?:е|а)\s+массы|диабет|инсулинорезистентност|гастрит|жкт|аллерги|непереносимост|беременност|гв|лактаци))|(?:можно|подходит|разрешен).*(?:при\s+(?:похудени|снижен(?:ии|ие)\s+веса|набор(?:е|а)\s+массы|диабет|инсулинорезистентност|гастрит|жкт|аллерги|непереносимост|беременност|гв|лактаци))/.test(
      normalized,
    );

  return {
    page,
    day,
    ingredients,
    kbju,
    instructions,
    personalBenefit,
  };
}

function formatMetadata(recipe: AnnaRecipeContext["metadata"]): string[] {
  const lines = [
    `Название: «${recipe.displayName}».`,
    `Техническое название: «${recipe.technicalName}».`,
    `Раздел: ${recipe.section}.`,
  ];

  if (recipe.week) {
    lines.push(`Неделя: ${recipe.week}.`);
  }

  if (recipe.timeOfDay) {
    lines.push(`Время: ${recipe.timeOfDay}.`);
  }

  return lines;
}

function formatFoundRecipe(
  message: string,
  recipe: AnnaRecipeContext,
): string {
  const needs = getRecipePromptNeeds(message);

  const lines = [
    "[ФАКТЫ О РЕЦЕПТЕ КНИГИ — ВЫСШИЙ ПРИОРИТЕТ]",
    "Найден ровно один рецепт в подтверждённых данных приложения.",
    ...formatMetadata(recipe.metadata),
  ];

  if (needs.page || needs.personalBenefit) {
    lines.push(`Страница: ${recipe.metadata.page}.`);
  }

  if (needs.day || needs.personalBenefit) {
    lines.push(`День: ${recipe.metadata.day}.`);
  }

  if (needs.ingredients) {
    const ingredients = recipe.details?.ingredients;

    if (ingredients !== null && ingredients !== undefined) {
      const formattedIngredients = Array.isArray(ingredients)
        ? ingredients.join("\n")
        : typeof ingredients === "string"
          ? ingredients
          : JSON.stringify(ingredients);

      lines.push(`Подтверждённый состав:\n${formattedIngredients}`);
    } else {
      lines.push("Подтверждённый состав в серверных данных недоступен.");
    }
  }

  if (needs.kbju || needs.personalBenefit) {
    const kbju = recipe.details?.kbju;

    if (kbju !== null && kbju !== undefined) {
      const formattedKbju = Array.isArray(kbju)
        ? kbju.join("\n")
        : typeof kbju === "string"
          ? kbju
          : JSON.stringify(kbju);

      lines.push(`Подтверждённое КБЖУ:\n${formattedKbju}`);
    } else {
      lines.push("Подтверждённое КБЖУ в серверных данных недоступно.");
    }
  }

  if (needs.instructions) {
    const instructions = recipe.details?.instructions;

    if (instructions) {
      lines.push(`Подтверждённая инструкция:\n${instructions}`);
    } else {
      lines.push(
        "Подтверждённая инструкция в серверных данных недоступна.",
      );
    }
  }

  if (needs.page) {
    lines.push(
      `ОБЯЗАТЕЛЬНЫЙ ПРЯМОЙ ОТВЕТ: рецепт «${recipe.metadata.displayName}» находится на странице ${recipe.metadata.page}.`,
      "Не говори, что номер страницы зависит от издания, версии, недели, раздела или приложения.",
      "Не предлагай пользователю искать рецепт и не задавай встречный вопрос.",
    );
  }

  if (needs.day) {
    lines.push(
      `ОБЯЗАТЕЛЬНЫЙ ПРЯМОЙ ОТВЕТ: рецепт «${recipe.metadata.displayName}» относится к дню ${recipe.metadata.day}.`,
      "Не заменяй номер дня неделей, разделом или общими рекомендациями.",
    );
  }

  if (needs.ingredients) {
    lines.push(
      "Если вопрос о наличии, отсутствии или допустимости ингредиента, отвечай только по приведённому подтверждённому составу.",
      "Не заявляй, что ингредиент есть или отсутствует, если это не следует из состава.",
    );
  }

  if (needs.kbju) {
    lines.push(
      "Если вопрос о белках, жирах, углеводах, калориях или клетчатке, назови только соответствующие значения из подтверждённого КБЖУ.",
      "Сохраняй указанную единицу измерения, включая «на 100 г», если она приведена в данных.",
    );
  }

  if (needs.instructions) {
    lines.push(
      "Если вопрос о приготовлении, опирайся только на подтверждённую инструкцию выше.",
      "Можно кратко и профессионально пояснить шаги, но не добавляй новые времена, температуры, ингредиенты или этапы.",
    );
  }

  lines.push(
    "Эти факты имеют приоритет над любыми общими знаниями, wiki-контекстом, предположениями и предыдущими сообщениями.",
    "Не выдумывай и не опровергай подтверждённые название, страницу, день, состав, КБЖУ или инструкцию.",
    "На прямой вопрос сначала дай прямой ответ, затем при необходимости добавь короткое профессиональное пояснение Анны.",
  );

  return lines.join("\n");
}

function formatAmbiguousRecipes(
  candidates: AnnaRecipeLookupResult & { status: "ambiguous" },
): string {
  const lines = [
    "[ПОИСК РЕЦЕПТА КНИГИ — нужно уточнение]",
    "Найдено несколько рецептов с указанным названием:",
  ];

  for (const [index, recipe] of candidates.candidates.entries()) {
    const details = [
      `«${recipe.displayName}»`,
      recipe.technicalName,
      recipe.section,
      `день ${recipe.day}`,
      `стр. ${recipe.page}`,
    ];

    if (recipe.timeOfDay) {
      details.push(recipe.timeOfDay);
    }

    lines.push(`${index + 1}. ${details.join(" — ")}.`);
  }

  lines.push(
    "Не выбирай вариант самостоятельно. Попроси пользователя уточнить конкретный рецепт.",
    "Не сообщай состав, КБЖУ или инструкцию, пока рецепт не уточнён.",
  );

  return lines.join("\n");
}

function formatNotFoundRecipe(): string {
  return [
    "[ПОИСК РЕЦЕПТА КНИГИ — подтверждённый результат]",
    "Рецепт с указанным названием в metadata Книги не найден.",
    "Скажи об этом прямо. Не выдумывай рецепт, название, страницу, день, состав, КБЖУ или инструкцию.",
    "Не заменяй его похожим рецептом.",
  ].join("\n");
}

export function buildAnnaRecipePromptBlock(
  message: string,
  lookup: AnnaRecipeLookupResult,
): string {
  if (lookup.status === "found") {
    return formatFoundRecipe(message, lookup.recipe);
  }

  if (lookup.status === "ambiguous") {
    return formatAmbiguousRecipes(lookup);
  }

  return formatNotFoundRecipe();
}