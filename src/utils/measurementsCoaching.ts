import { MeasurementContext, getRandomPhrase } from "./measurementsPhrases";
import { DailySummary } from "./crossModuleSummary";

const tonusLabelByStatus = (status: string): { energy: string; mood: string; wellbeing: string } => {
  if (status === "high") return { energy: "Высокая", mood: "Лёгкое", wellbeing: "Хорошее" };
  if (status === "low") return { energy: "Сниженная", mood: "Тяжёлое", wellbeing: "Плохое" };
  return { energy: "Спокойная", mood: "Ровное", wellbeing: "Среднее" };
};

export const getMeasurementsFeedback = (
  summary: DailySummary,
  userName?: string,
  userGender?: string
): string => {
  const m = summary.measurements;
  const tonusLabels = tonusLabelByStatus(m.tonus);

  const ctx: MeasurementContext = {
    userName,
    userGender: userGender as 'male' | 'female',
    summary,
    pulse: m.pulseAvg,
    weight: m.weightAvg,
    initialWeight: m.weightDelta !== null && m.weightAvg !== null ? m.weightAvg - m.weightDelta : null,
    weightDelta: m.weightDelta,
    tonusEnergy: tonusLabels.energy,
    tonusMood: tonusLabels.mood,
    tonusWellbeing: tonusLabels.wellbeing,
  };

  let summaryText = "";

  // ============ КРОСС-ТРИГГЕРЫ ============
  // 1. Тонус низкий + запор в ЖКТ -> связка «застой роняет энергию»
  if (m.tonus === "low" && summary.digestion.status === "constipation") {
    summaryText += getRandomPhrase("tonusLowConstipation", ctx) + " ";
    return summaryText.trim();
  }

  // 2. Тонус высокий, но активности мало -> похвала + просьба добавить шаги
  if (m.tonus === "high" && summary.movement.activeMin < 30) {
    summaryText += getRandomPhrase("tonusHighNeedMovement", ctx) + " ";
    return summaryText.trim();
  }

  // ============ СТАНДАРТНЫЕ ВЕТКИ (тонус normal / no_data) ============
  // БЛОК 1: ПУЛЬС
  if (ctx.pulse && ctx.pulse > 75) {
    summaryText += getRandomPhrase("pulseHigh", ctx) + " ";
  } else if (ctx.pulse) {
    summaryText += getRandomPhrase("pulseNormal", ctx) + " ";
  }

  // БЛОК 2: ВЕС
  if (ctx.weightDelta !== null && ctx.weightDelta < 0) {
    summaryText += getRandomPhrase("weightLoss", ctx) + " ";
  } else if (ctx.weightDelta !== null && ctx.weightDelta >= 0) {
    summaryText += getRandomPhrase("weightGainOrPlateau", ctx) + " ";
  }

  // БЛОК 3: ТОНУС
  if (m.tonus === "low") {
    summaryText += getRandomPhrase("tonusLow", ctx) + " ";
  } else if (m.tonus === "high") {
    summaryText += getRandomPhrase("tonusHigh", ctx) + " ";
  }

  return summaryText.trim();
};
