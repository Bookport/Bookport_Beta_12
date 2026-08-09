import { MovementContext, getRandomPhrase } from "./movementPhrases";
import { DailySummary } from "./crossModuleSummary";

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
  userGender?: string
): MovementAdviceResult => {
  const movement = summary.movement;
  const activeMinutes = movement.activeMin;
  const dailyGoal = 30; // Общая дневная цель активности (мин)

  const ctx: MovementContext = {
    userName,
    userGender: userGender as 'male' | 'female',
    summary,
    activeMinutes,
    dailyGoal,
    pulse: summary.measurements.pulseAvg,
    weightDelta: summary.measurements.weightDelta,
  };

  // Сверхактивность всегда помечается отдельно по стилю
  const overactiveStyle = activeMinutes >= 60 ? LEVEL_STYLES.overactive : null;

  // ============ КРОСС-ТРИГГЕРЫ ============
  // 1. Малоподвижность + запор в ЖКТ
  if (movement.status === "sedentary" && summary.digestion.status === "constipation") {
    return {
      text: getRandomPhrase("movementSedentaryConstipation", ctx),
      glowBorderClass: overactiveStyle ? overactiveStyle.glowBorderClass : LEVEL_STYLES.low.glowBorderClass,
      statusBadge: overactiveStyle ? overactiveStyle.statusBadge : LEVEL_STYLES.low.statusBadge,
      label: overactiveStyle ? overactiveStyle.label : "Кишечник просит движения",
    };
  }

  // 2. Норма движения + высокий тонус
  if (movement.status === "active" && summary.measurements.tonus === "high") {
    return {
      text: getRandomPhrase("movementActiveTonusHigh", ctx),
      glowBorderClass: overactiveStyle ? overactiveStyle.glowBorderClass : LEVEL_STYLES.done.glowBorderClass,
      statusBadge: overactiveStyle ? overactiveStyle.statusBadge : LEVEL_STYLES.done.statusBadge,
      label: overactiveStyle ? overactiveStyle.label : "Идеальный баланс",
    };
  }

// 3. Норма движения + низкий тонус
  if (movement.status === "active" && summary.measurements.tonus === "low") {
    return {
      text: getRandomPhrase("movementActiveTonusLow", ctx),
      glowBorderClass: overactiveStyle ? overactiveStyle.glowBorderClass : LEVEL_STYLES.progress.glowBorderClass,
      statusBadge: overactiveStyle ? overactiveStyle.statusBadge : LEVEL_STYLES.progress.statusBadge,
      label: overactiveStyle ? overactiveStyle.label : "Время восстановления",
    };
  }

  // 4. Малоподвижность + низкий тонус -> тело в экономии (проверяется до заглушки нулевой активности)
  if (movement.status === "sedentary" && summary.measurements.tonus === "low") {
    return {
      text: getRandomPhrase("movementSedentaryTonusLow", ctx),
      glowBorderClass: overactiveStyle ? overactiveStyle.glowBorderClass : LEVEL_STYLES.zero.glowBorderClass,
      statusBadge: overactiveStyle ? overactiveStyle.statusBadge : LEVEL_STYLES.low.statusBadge,
      label: "Разбудим организм",
    };
  }

  // ============ СТАНДАРТНЫЕ ВЕТКИ ============
  if (activeMinutes === 0) {
    return {
      text: "Движение — это жизнь! Давай сделаем хотя бы короткую разминку сегодня.",
      glowBorderClass: LEVEL_STYLES.zero.glowBorderClass,
      statusBadge: LEVEL_STYLES.zero.statusBadge,
      label: LEVEL_STYLES.zero.label,
    };
  }

  const percent = dailyGoal > 0 ? (activeMinutes / dailyGoal) * 100 : 0;

  if (percent < 50) {
    let text = "";
    if (ctx.pulse && ctx.pulse > 75) text = getRandomPhrase("movementCritical_HighPulse", ctx);
    else if (ctx.weightDelta && ctx.weightDelta >= 0) text = getRandomPhrase("movementCritical_WeightGain", ctx);
    else text = getRandomPhrase("movementCritical_Base", ctx);
    return {
      text,
      glowBorderClass: overactiveStyle ? overactiveStyle.glowBorderClass : LEVEL_STYLES.low.glowBorderClass,
      statusBadge: overactiveStyle ? overactiveStyle.statusBadge : LEVEL_STYLES.low.statusBadge,
      label: overactiveStyle ? overactiveStyle.label : LEVEL_STYLES.low.label,
    };
  }

  if (percent >= 50 && percent < 100) {
    return {
      text: getRandomPhrase("movementProgress", ctx),
      glowBorderClass: overactiveStyle ? overactiveStyle.glowBorderClass : LEVEL_STYLES.progress.glowBorderClass,
      statusBadge: overactiveStyle ? overactiveStyle.statusBadge : LEVEL_STYLES.progress.statusBadge,
      label: overactiveStyle ? overactiveStyle.label : LEVEL_STYLES.progress.label,
    };
  }

  // >= 100%
  if (ctx.weightDelta && ctx.weightDelta < 0) {
    return {
      text: getRandomPhrase("movementGoalReached_WeightLoss", ctx),
      glowBorderClass: overactiveStyle ? overactiveStyle.glowBorderClass : LEVEL_STYLES.done.glowBorderClass,
      statusBadge: overactiveStyle ? overactiveStyle.statusBadge : LEVEL_STYLES.done.statusBadge,
      label: overactiveStyle ? overactiveStyle.label : LEVEL_STYLES.done.label,
    };
  }
  return {
    text: getRandomPhrase("movementGoalReached_Base", ctx),
    glowBorderClass: overactiveStyle ? overactiveStyle.glowBorderClass : LEVEL_STYLES.done.glowBorderClass,
    statusBadge: overactiveStyle ? overactiveStyle.statusBadge : LEVEL_STYLES.done.statusBadge,
    label: overactiveStyle ? overactiveStyle.label : LEVEL_STYLES.done.label,
  };
};
