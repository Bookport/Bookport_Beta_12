import { MeasurementContext, getRandomPhrase } from "./measurementsPhrases";

export const generateCrossModuleSummary = (ctx: MeasurementContext): string => {
  if (!ctx.pulse || !ctx.weight || !ctx.initialWeight) return "";

  let summary = "";
  const isTonusLow = ctx.tonusEnergy === 'Сниженная' || ctx.tonusMood === 'Тяжёлое' || ctx.tonusWellbeing === 'Плохое';
  const isTonusHigh = ctx.tonusEnergy === 'Высокая' && ctx.tonusMood === 'Лёгкое' && ctx.tonusWellbeing === 'Хорошее';

  // БЛОК 1: ПУЛЬС
  if (ctx.pulse > 75) {
    summary += getRandomPhrase("pulseHigh", ctx) + " ";
  } else {
    summary += getRandomPhrase("pulseNormal", ctx) + " ";
  }

  // БЛОК 2: ВЕС
  if (ctx.weightDelta !== null && ctx.weightDelta < 0) {
    summary += getRandomPhrase("weightLoss", ctx) + " ";
  } else if (ctx.weightDelta !== null && ctx.weightDelta >= 0) {
    summary += getRandomPhrase("weightGainOrPlateau", ctx) + " ";
  }

  // БЛОК 3: ТОНУС
  if (isTonusLow) {
    summary += getRandomPhrase("tonusLow", ctx) + " ";
  } else if (isTonusHigh) {
    summary += getRandomPhrase("tonusHigh", ctx) + " ";
  }

  return summary.trim();
};
