import { MovementContext, getRandomPhrase } from "./movementPhrases";

export interface MovementAdviceResult {
  text: string;
  glowBorderClass: string;
  statusBadge: string;
  label: string;
}

export const generateMovementSummary = (ctx: MovementContext): MovementAdviceResult => {
  let text = "";
  // Базовые стили для 0 минут
  let glowBorderClass = "border-[#94A3B8] shadow-slate-150/50 shadow-md"; 
  let statusBadge = "bg-slate-100 text-slate-700";
  let label = "Готовы начать?";

  if (ctx.activeMinutes === 0) {
    return { 
      text: "Движение — это жизнь! Давай сделаем хотя бы короткую разминку сегодня.",
      glowBorderClass: "border-[#94A3B8] shadow-slate-150/50 shadow-md",
      statusBadge: "bg-slate-100 text-slate-700",
      label: "Готовы начать?"
    };
  }
  
  const percent = ctx.dailyGoal > 0 ? (ctx.activeMinutes / ctx.dailyGoal) * 100 : 0;

  if (percent < 50) {
    glowBorderClass = "border-[#FACC15] shadow-[#FEF08A]/75 shadow-md";
    statusBadge = "bg-[#FEF08A] text-[#854D0E]";
    label = "Начало положено";

    if (ctx.pulse && ctx.pulse > 75) text = getRandomPhrase("movementCritical_HighPulse", ctx);
    else if (ctx.weightDelta && ctx.weightDelta >= 0) text = getRandomPhrase("movementCritical_WeightGain", ctx);
    else text = getRandomPhrase("movementCritical_Base", ctx);
  } 
  else if (percent >= 50 && percent < 100) {
    glowBorderClass = "border-[#A78BFA] shadow-[#DDD6FE]/75 shadow-md";
    statusBadge = "bg-[#EDE9FE] text-[#6D28D9]";
    label = "Хороший темп";
    text = getRandomPhrase("movementProgress", ctx);
  } 
  else {
    glowBorderClass = "border-[#10B981] shadow-[#A7F3D0]/75 shadow-md";
    statusBadge = "bg-[#D1FAE5] text-[#065F46]";
    label = "Цель выполнена";
    
    if (ctx.weightDelta && ctx.weightDelta < 0) text = getRandomPhrase("movementGoalReached_WeightLoss", ctx);
    else text = getRandomPhrase("movementGoalReached_Base", ctx);
  }

  // Сверхактивность (overactive) color fallback if > 60
  if (ctx.activeMinutes >= 60) {
    glowBorderClass = "border-[#F97316] shadow-[#FDBA74]/75 shadow-md";
    statusBadge = "bg-[#FFEDD5] text-[#C2410C]";
    label = "Сверхактивность!";
  }

  return { text, glowBorderClass, statusBadge, label };
};
