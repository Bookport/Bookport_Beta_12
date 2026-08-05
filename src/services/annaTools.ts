import { prisma } from "../prisma";
import { safeParseJSON } from "../utils/safeParseJSON";
import { MOVEMENT_DAILY_TARGET_MIN } from "../constants/movement";

function parseKbjuToNumbers(kbjuRaw: string | null): {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  fiber: number | null;
  raw: string[] | null;
} {
  const fallback = { calories: null, protein: null, fat: null, fiber: null, raw: null };
  if (!kbjuRaw) return fallback;
  const parsed = safeParseJSON<string[]>(kbjuRaw);
  if (!Array.isArray(parsed)) return fallback;

  const result: { calories: number | null; protein: number | null; fat: number | null; fiber: number | null } =
    { calories: null, protein: null, fat: null, fiber: null };

  for (const line of parsed) {
    const clean = line.replace(/[;.]/g, "").replace(",", ".");
    const kcalMatch = clean.match(/калорийность:\s*([\d.]+)/i);
    if (kcalMatch) result.calories = parseFloat(kcalMatch[1]);
    const protMatch = clean.match(/белок:\s*([\d.]+)/i);
    if (protMatch) result.protein = parseFloat(protMatch[1]);
    const fatMatch = clean.match(/жиры?:\s*([\d.]+)/i);
    if (fatMatch) result.fat = parseFloat(fatMatch[1]);
    const fiberMatch = clean.match(/клетчатк[ау]:\s*([\d.]+)/i);
    if (fiberMatch) result.fiber = parseFloat(fiberMatch[1]);
  }

  return { ...result, raw: parsed };
}

export const ANNA_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "get_dishes",
      description: "Получить сохранённые/приготовленные блюда пользователя (из фото, 'собери сам', книги, mixer). Используй когда спрашивают о блюдах, избранном, категориях, составе 'Мои блюда', что приготовлено.",
      parameters: {
        type: "object" as const,
        properties: {
          category: { type: "string", description: "Категория (например Завтраки, Салаты, Книга)" },
          sourceType: { type: "string", description: "Источник: book, photo, custom, mixer" },
          isBookRecipe: { type: "boolean", description: "Только из книги" },
          isFavorite: { type: "boolean", description: "Только избранное" },
          limit: { type: "number", description: "Максимум, по умолчанию 15" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_recipe_progress",
      description: "Прогресс приготовления рецептов. Используй когда спрашивают что приготовлено/пропущено.",
      parameters: {
        type: "object" as const,
        properties: {
          dayIndex: { type: "number", description: "Номер дня (0-based)" },
          status: { type: "string", description: "Статус: cooked, skipped" },
          limit: { type: "number", description: "Максимум, по умолчанию 20" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_diary_entries",
      description: "Записи дневника пользователя. Используй когда спрашивают о дневнике, заметках, настроении.",
      parameters: {
        type: "object" as const,
        properties: {
          dayIndex: { type: "number", description: "Номер дня (0-based)" },
          limit: { type: "number", description: "Максимум, по умолчанию 10" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_daily_metrics",
      description: "Дневные метрики: вода, сон, активность, пищеварение, замеры. Используй когда спрашивают о здоровье, метриках, прогрессе.",
      parameters: {
        type: "object" as const,
        properties: {
          dayIndex: { type: "number", description: "Номер дня (0-based). Если не указан — последние 7 дней." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_user_achievements",
      description: "Достижения (ачивки) пользователя. Используй когда спрашивают об ачивках, наградах, успехах.",
      parameters: {
        type: "object" as const,
        properties: {
          limit: { type: "number", description: "Максимум, по умолчанию 15" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_book_recipe_details",
      description: "Детали рецепта из книги рецептов: ингредиенты, инструкция, КБЖУ. Используй когда спрашивают о конкретном рецепте.",
      parameters: {
        type: "object" as const,
        properties: {
          name: { type: "string", description: "Название (technicalName) рецепта или его часть для поиска" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_user_profile",
      description: "Профиль пользователя: имя, возраст, вес, рост, давление, цели, заболевания.",
      parameters: {
        type: "object" as const,
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_book_table_of_contents",
      description: "Оглавление книги рецептов — все рецепты сгруппированы по типу.",
      parameters: {
        type: "object" as const,
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_daily_kbju_summary",
      description: "Суммарное КБЖУ за день на основе приготовленных рецептов. Подсчитывает общие калории, белки, жиры, клетчатку. Используй когда спрашивают о питании, калориях, КБЖУ за день.",
      parameters: {
        type: "object" as const,
        properties: {
          dayIndex: { type: "number", description: "Номер дня (0-based), за который нужно подсчитать КБЖУ" },
        },
        required: ["dayIndex"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_water_analytics",
      description: "КРИТИЧЕСКИ ВАЖНО: Ты ОБЯЗАНА вызывать эту функцию ВСЕГДА, когда пользователь упоминает воду, жажду, выпитый объем или норму гидратации. СТРОГО ЗАПРЕЩЕНО выдумывать, предполагать или генерировать цифры по воде самостоятельно. Получи реальные данные только через эту функцию.",
      parameters: {
        type: "object" as const,
        properties: {},
      },
    },
  },
];

export async function executeToolCall(
  name: string,
  args: Record<string, any>,
  userId: string
): Promise<Record<string, any>> {
  try {
    switch (name) {
      case "get_dishes":
      case "get_cooked_dishes":
      case "get_saved_dishes": {
        const { category, sourceType, isBookRecipe, isFavorite, limit } = args;
        const where: any = { userId };
        if (category) where.category = category;
        if (sourceType) where.sourceType = sourceType;
        else where.sourceType = { not: "mixer" };
        if (isBookRecipe !== undefined) where.isBookRecipe = isBookRecipe;
        if (isFavorite !== undefined) where.isFavorite = isFavorite;
        const dishes = await prisma.savedDish.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: Math.min(limit || 15, 50),
        });

        const enrichedDishes = await Promise.all(
          dishes.map(async (d) => {
            let bookKbju = null;
            if (d.isBookRecipe && d.bookRecipeType && d.bookRecipeId) {
              try {
                const bookRecipe = await prisma.bookRecipe.findUnique({
                  where: { type_id: { type: d.bookRecipeType, id: d.bookRecipeId } },
                });
                if (bookRecipe?.kbju) {
                  bookKbju = parseKbjuToNumbers(bookRecipe.kbju);
                }
              } catch {
                // ignore enrichment errors
              }
            }
            return {
              id: d.id,
              name: d.name,
              category: d.category,
              isFavorite: d.isFavorite,
              isBookRecipe: d.isBookRecipe,
              bookRecipeType: d.bookRecipeType,
              bookRecipeId: d.bookRecipeId,
              sourceType: d.sourceType || "unknown",
              tag: d.tag,
              calories: d.calories || (bookKbju?.calories ?? null),
              protein: d.protein || (bookKbju?.protein ?? null),
              fat: d.fat || (bookKbju?.fat ?? null),
              fiber: d.fiber || (bookKbju?.fiber ?? null),
              bookKbju: bookKbju?.raw ?? null,
              ingredients: d.ingredients,
              createdAt: d.createdAt,
            };
          })
        );
        return {
          count: enrichedDishes.length,
          dishes: enrichedDishes,
        };
      }

      case "get_recipe_progress": {
        const { dayIndex, status, limit } = args;
        const where: any = { userId };
        if (dayIndex !== undefined) where.dayIndex = dayIndex;
        if (status) where.status = status;
        const progress = await prisma.recipeProgress.findMany({
          where,
          include: { bookRecipe: true },
          orderBy: { createdAt: "desc" },
          take: Math.min(limit || 20, 50),
        });
        return {
          count: progress.length,
          items: progress.map((p) => {
            const kbju = p.bookRecipe?.kbju ? parseKbjuToNumbers(p.bookRecipe.kbju) : null;
            return {
              recipeName: p.bookRecipe?.technicalName || "неизвестный",
              recipeType: p.bookRecipe?.type || null,
              status: p.status,
              dayIndex: p.dayIndex,
              note: p.note,
              calories: kbju?.calories ?? null,
              protein: kbju?.protein ?? null,
              fat: kbju?.fat ?? null,
              fiber: kbju?.fiber ?? null,
              kbjuLines: kbju?.raw ?? null,
            };
          }),
        };
      }

      case "get_diary_entries": {
        const { dayIndex, limit } = args;
        const where: any = { userId };
        if (dayIndex !== undefined) where.dayIndex = dayIndex;
        const entries = await prisma.diaryEntry.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: Math.min(limit || 10, 30),
        });
        return {
          count: entries.length,
          entries: entries.map((e) => ({
            dayIndex: e.dayIndex,
            note: e.note ? e.note.slice(0, 250) : null,
            mood: e.mood,
            time: e.time,
            tags: e.tags,
            createdAt: e.createdAt,
          })),
        };
      }

      case "get_daily_metrics": {
        const { dayIndex } = args;
        const where: any = { userId };
        if (dayIndex !== undefined) {
          where.dayIndex = dayIndex;
        }
        
        // Fetch requested metrics
        const metrics = await prisma.dailyMetric.findMany({
          where,
          orderBy: { date: "desc" },
          take: dayIndex !== undefined ? 1 : 7,
        });

        // Compute streak (marathon days)
        const recentHistory = await prisma.dailyMetric.findMany({
          where: { userId },
          orderBy: { date: "desc" },
          take: 30, // Last 30 days is enough to calculate current streak
        });
        let activeStreak = 0;
        let isFirst = true;
        for (const record of recentHistory) {
          if ((record.activityMinutes || 0) >= MOVEMENT_DAILY_TARGET_MIN) {
            activeStreak++;
          } else if (isFirst && (record.activityMinutes || 0) < MOVEMENT_DAILY_TARGET_MIN) {
            // Skip today if the target is not met yet, don't break the streak
          } else {
            break;
          }
          isFirst = false;
        }

        return {
          count: metrics.length,
          metrics: metrics.map((m) => {
            const isMovementGoalMet = (m.activityMinutes || 0) >= MOVEMENT_DAILY_TARGET_MIN;
            const movementSummary = `Активность: ${m.activityMinutes || 0} мин. Норма (${MOVEMENT_DAILY_TARGET_MIN} мин): ${isMovementGoalMet ? 'выполнена' : 'не выполнена'}. Активная серия дней: ${activeStreak}.`;

            return {
              dayIndex: m.dayIndex,
              date: m.date,
              waterMl: m.waterMl,
              sleepMinutes: m.sleepMinutes,
              mealCount: m.mealCount,
              habitsDone: m.habitsDone,
              measurements: m.measurements,
              digestionLog: m.digestionLog,
              movementSummary, // Replacing the raw arrays
            };
          }),
        };
      }

      case "get_user_achievements": {
        const { limit } = args;
        const achievements = await prisma.userAchievement.findMany({
          where: { userId, unlocked: true },
          include: { achievement: true },
          orderBy: { unlockedAt: "desc" },
          take: Math.min(limit || 15, 50),
        });
        return {
          count: achievements.length,
          achievements: achievements.map((a) => ({
            name: a.achievement.name,
            category: a.achievement.category,
            rarity: a.achievement.rarity,
            xp: a.achievement.xp,
            unlockedAt: a.unlockedAt,
          })),
        };
      }

      case "get_book_recipe_details": {
        const { name } = args;
        if (!name) return { error: "Укажи название рецепта" };
        const recipe = await prisma.bookRecipe.findFirst({
          where: { technicalName: { contains: name, mode: "insensitive" } },
        });
        if (!recipe) return { notFound: true, message: `Рецепт "${name}" не найден` };
        return {
          name: recipe.technicalName,
          type: recipe.type,
          day: recipe.day,
          page: recipe.page,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions.slice(0, 1000),
          kbju: safeParseJSON(recipe.kbju),
        };
      }

      case "get_user_profile": {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return { notFound: true, message: "Пользователь не найден" };
        return {
          name: user.name,
          gender: user.gender,
          age: user.age,
          height: user.height,
          weight: user.weight,
          systolic: user.systolic,
          diastolic: user.diastolic,
          hasSavedSettings: user.hasSavedSettings,
          chronicConditions: user.chronicConditions,
          healthGoals: user.healthGoals,
        };
      }

      case "get_book_table_of_contents": {
        const recipes = await prisma.bookRecipe.findMany({
          orderBy: [{ type: "asc" }, { id: "asc" }],
        });
        const grouped: Record<string, string[]> = {};
        for (const r of recipes) {
          if (!grouped[r.type]) grouped[r.type] = [];
          grouped[r.type].push(r.technicalName);
        }
        return { recipes_by_type: grouped };
      }

      case "get_daily_kbju_summary": {
        const { dayIndex } = args;
        if (dayIndex === undefined || dayIndex === null) {
          return { error: "Укажи dayIndex для подсчёта КБЖУ за день" };
        }

        let totalCalories = 0;
        let totalProtein = 0;
        let totalFat = 0;
        let totalFiber = 0;
        const items: Array<{
          name: string;
          source: string;
          calories: number | null;
          protein: number | null;
          fat: number | null;
          fiber: number | null;
        }> = [];

        const progress = await prisma.recipeProgress.findMany({
          where: { userId, dayIndex, status: "cooked" },
          include: { bookRecipe: true },
        });
        for (const p of progress) {
          const kbju = p.bookRecipe?.kbju ? parseKbjuToNumbers(p.bookRecipe.kbju) : null;
          if (kbju?.calories) totalCalories += kbju.calories;
          if (kbju?.protein) totalProtein += kbju.protein;
          if (kbju?.fat) totalFat += kbju.fat;
          if (kbju?.fiber) totalFiber += kbju.fiber;
          items.push({
            name: p.bookRecipe?.technicalName || "неизвестный",
            source: "book",
            calories: kbju?.calories ?? null,
            protein: kbju?.protein ?? null,
            fat: kbju?.fat ?? null,
            fiber: kbju?.fiber ?? null,
          });
        }

        const savedDishes = await prisma.savedDish.findMany({
          where: { userId, dayIndex, sourceType: { not: "mixer" } },
        });
        for (const d of savedDishes) {
          if (d.calories) totalCalories += d.calories;
          if (d.protein) totalProtein += parseFloat(d.protein) || 0;
          if (d.fat) totalFat += parseFloat(d.fat) || 0;
          if (d.fiber) totalFiber += parseFloat(d.fiber) || 0;
          items.push({
            name: d.name,
            source: d.sourceType || "saved",
            calories: d.calories ?? null,
            protein: d.protein ? parseFloat(d.protein) : null,
            fat: d.fat ? parseFloat(d.fat) : null,
            fiber: d.fiber ? parseFloat(d.fiber) : null,
          });
        }

        if (items.length === 0) {
          return { dayIndex, recipeCount: 0, message: "Нет блюд за этот день" };
        }

        return {
          dayIndex,
          totalItems: items.length,
          totalCalories: Math.round(totalCalories * 10) / 10,
          totalProtein: Math.round(totalProtein * 10) / 10,
          totalFat: Math.round(totalFat * 10) / 10,
          totalFiber: Math.round(totalFiber * 10) / 10,
          items,
        };
      }

      case "get_water_analytics": {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const weight = user?.weight ?? user?.initialWeight ?? 65;
        const dailyGoal = Math.round(weight * 30);

        // Determine today's dayIndex from user's current course day
        const todayIndex = user?.currentDayIndex ?? 1;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const metric = await prisma.dailyMetric.findFirst({
          where: { userId, date: { gte: today } },
          orderBy: { date: "desc" },
        });

        const sessionMetric = metric ?? await prisma.dailyMetric.findFirst({
          where: { userId, dayIndex: todayIndex },
          orderBy: { date: "desc" },
        });

        const drankToday = sessionMetric?.waterMl ?? 0;

        let lastDrinkTime: string | null = null;
        const rawWaterEntries = sessionMetric?.waterEntries;
        if (rawWaterEntries) {
          try {
            const entries = safeParseJSON<Array<{ time?: string; timestamp?: number }>>(rawWaterEntries);
            if (Array.isArray(entries) && entries.length > 0) {
              const last = entries[entries.length - 1];
              lastDrinkTime = last?.time || null;
            }
          } catch {
            // ignore parse errors
          }
        }

        return {
          real_data: {
            drank_today_ml: drankToday,
            daily_goal_ml: dailyGoal,
            last_drink_time: lastDrinkTime,
          },
          STRICT_FORMATTING_RULE: "КРИТИЧЕСКИЙ ПРИКАЗ: При ответе пользователю СТРОГО ЗАПРЕЩЕНО использовать цифры для обозначения объема (например, 1150, 1.5, 2394). Ты обязана перевести все объемы в текст прописью. Пример: вместо '1150 мл' напиши 'один литр сто пятьдесят миллилитров'. За нарушение этого правила система будет отключена.",
        };
      }

      default:
        return { error: `Неизвестная функция: ${name}` };
    }
  } catch (err: any) {
    console.warn(`[AnnaTool] ${name} failed:`, err.message);
    return { error: `Ошибка при выполнении ${name}: ${err.message}` };
  }
}
