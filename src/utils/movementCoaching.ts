import { MovementContext, MOVEMENT_PHRASES, MOVEMENT_FOOD_CONTEXT_PHRASES, getRandomPhrase } from "./movementPhrases";
import { DailySummary } from "./crossModuleSummary";
import { MovementEntry } from "../store/useAppStore";
import { ACTIVITY_CONFIGS } from "../constants/movement";
import type { FoodSummary } from "../services/foodSummary";

export interface MovementAdviceResult {
  text: string;
  glowBorderClass: string;
  statusBadge: string;
  label: string;
}

const LEVEL_STYLES = {
  zero: {
    glowBorderClass: "border-[#94A3B8] shadow-slate-150/50 shadow-md",
    statusBadge: "bg-slate-100 text-slate-700",
    label: "Готовы начать?",
  },
  low: {
    glowBorderClass: "border-[#FACC15] shadow-[#FEF08A]/75 shadow-md",
    statusBadge: "bg-[#FEF08A] text-[#854D0E]",
    label: "Начало положено",
  },
  progress: {
    glowBorderClass: "border-[#A78BFA] shadow-[#DDD6FE]/75 shadow-md",
    statusBadge: "bg-[#EDE9FE] text-[#6D28D9]",
    label: "Хороший темп",
  },
  done: {
    glowBorderClass: "border-[#10B981] shadow-[#A7F3D0]/75 shadow-md",
    statusBadge: "bg-[#D1FAE5] text-[#065F46]",
    label: "Цель выполнена",
  },
  overactive: {
    glowBorderClass: "border-[#F97316] shadow-[#FDBA74]/75 shadow-md",
    statusBadge: "bg-[#FFEDD5] text-[#C2410C]",
    label: "Сверхактивность!",
  },
};

export const generateMovementSummary = (
  summary: DailySummary,
  userName?: string,
  userGender?: string,
  movementEntries: MovementEntry[] = [],
  foodSummary?: FoodSummary,
  isCurrentDay: boolean = true
): MovementAdviceResult => {
  const movement = summary.movement;
  const activeMinutes = movement.activeMin;
  const dailyGoal = 30; // Общая дневная цель активности (мин)

  // ============ ШАГ 1: ПОДГОТОВКА ДАННЫХ ============
  const percent = dailyGoal > 0 ? (activeMinutes / dailyGoal) * 100 : 0;

  // Уникальные типы активности за день, замапленные на английские ключи ACTIVITY_CONFIGS
  const rawActivityTypes = Array.from(
    new Set(movementEntries.map(e => (e.type || e.activityType || "").trim()).filter(Boolean))
  );
  const activityTypes = rawActivityTypes.map(raw => {
    const match = Object.entries(ACTIVITY_CONFIGS).find(([key, config]) => key === raw || config.name === raw);
    return match ? match[0] : raw;
  });

  // Процент выполнения нормы воды
  const waterGoal = summary.water.goal;
  const waterPercent = waterGoal > 0 ? (summary.water.amount / waterGoal) * 100 : 0;

  // Серия активных дней (если поле отсутствует — 0)
  const streak = (movement as { activeStreak?: number }).activeStreak ?? 0;

  const ctx: MovementContext = {
    userName,
    userGender: userGender as 'male' | 'female',
    summary,
    activeMinutes,
    dailyGoal,
    activityTypes,
    streak,
    waterPercent,
    pulse: summary.measurements.latestPulse,
    weightDelta: summary.measurements.weightDelta,
  };

  // Сверхактивность всегда помечается отдельно по стилю
  const overactiveStyle = activeMinutes >= 60 ? LEVEL_STYLES.overactive : null;

  // ============ ШАГ 3: АДДИТИВНАЯ СБОРКА ============
  const phrases: string[] = [];

  // 1. Базовый статус
  if (activeMinutes === 0) {
    phrases.push("Движение — это жизнь! Давай сделаем хотя бы короткую разминку сегодня.");
  } else if (percent < 50) {
    phrases.push(getRandomPhrase("movementCritical_Base", ctx));
  } else if (percent >= 50 && percent < 100) {
    phrases.push(getRandomPhrase("movementProgress", ctx));
  } else {
    phrases.push(getRandomPhrase("movementGoalReached_Base", ctx));
  }

  // 2. Тип активности (не больше 1 фразы — берём тип последней записи за день)
  const lastEntry = movementEntries[movementEntries.length - 1];
  const lastRaw = (lastEntry?.type || lastEntry?.activityType || "").trim();
  const lastMatch = lastRaw
    ? Object.entries(ACTIVITY_CONFIGS).find(
        ([key, config]) => key === lastRaw || config.name === lastRaw
      )
    : undefined;
  const typeKey = lastMatch ? lastMatch[0] : lastRaw;

  if (typeKey && `movementType_${typeKey}` in MOVEMENT_PHRASES) {
    phrases.push(
      getRandomPhrase(
        `movementType_${typeKey}` as keyof typeof MOVEMENT_PHRASES,
        ctx
      )
    );
  }

  // 3. Кросс-модульные связи
  if (waterPercent < 70 && activeMinutes > 15) {
    phrases.push(getRandomPhrase("crossWater_Deficit", ctx));
  }
  if (activeMinutes < 15 && summary.digestion.status === "constipation") {
    phrases.push(getRandomPhrase("crossDigestion_Constipation", ctx));
  }
  if (activeMinutes > 15 && ctx.weightDelta !== null && ctx.weightDelta < 0) {
    phrases.push(getRandomPhrase("crossMeasurements_WeightLoss", ctx));
  }
  if (activeMinutes < 15 && ctx.pulse !== null && ctx.pulse > 75) {
    phrases.push(getRandomPhrase("crossMeasurements_HighPulse", ctx));
  }

  // 4. Серия
  if (streak >= 3) {
    phrases.push(getRandomPhrase("streak_Motivation", ctx));
  }

  // 5. B6: Пищевой контекст — ровно один отдельный последний абзац.
  // Строгий приоритет, максимум одна фраза. Питание приходит ТОЛЬКО через
  // FoodSummary (не через crossModuleSummary). Никаких calories/protein/fat/
  // carbohydrates, mealSlot, firstMealAt/lastMealAt, yesterdayFiber.
  if (foodSummary) {
    if (foodSummary.mealCount === 0) {
      phrases.push(
        isCurrentDay
          ? MOVEMENT_FOOD_CONTEXT_PHRASES.foodContext_NoMeals_today
          : MOVEMENT_FOOD_CONTEXT_PHRASES.foodContext_NoMeals_history
      );
    } else if (foodSummary.mealCount > foodSummary.strictMealCount) {
      phrases.push(MOVEMENT_FOOD_CONTEXT_PHRASES.foodContext_PartialMacros);
    } else if (foodSummary.strictMealCount > 0 && foodSummary.strictTotals.fiber > 0) {
      phrases.push(MOVEMENT_FOOD_CONTEXT_PHRASES.foodContext_FiberIncluded);
    }
  }

  // ============ ШАГ 4: ВОЗВРАТ ============
  const style = overactiveStyle || (activeMinutes === 0
    ? LEVEL_STYLES.zero
    : percent < 50
      ? LEVEL_STYLES.low
      : percent < 100
        ? LEVEL_STYLES.progress
        : LEVEL_STYLES.done);

  return {
    text: phrases.join("\n\n"),
    glowBorderClass: style.glowBorderClass,
    statusBadge: style.statusBadge,
    label: style.label,
  };
};
