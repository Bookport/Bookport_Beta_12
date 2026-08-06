import { MeasurementContext, getRandomPhrase } from "./measurementsPhrases";

export const generateCrossModuleSummary = (ctx: MeasurementContext): string => {
  // Если нет обязательных данных, ничего не генерируем
  if (!ctx.pulse || !ctx.weight || !ctx.initialWeight) return "";

  let summary = "";
  const isTonusLow = ctx.tonusEnergy === 'Сниженная' || ctx.tonusMood === 'Тяжёлое' || ctx.tonusWellbeing === 'Плохое';
  const isTonusHigh = ctx.tonusEnergy === 'Высокая' && ctx.tonusMood === 'Лёгкое' && ctx.tonusWellbeing === 'Хорошее';

  // КАСКАД ПРИОРИТЕТОВ:
  // Приоритет 1: Высокий пульс (критично для WFPB)
  if (ctx.pulse > 75) {
    summary += getRandomPhrase("pulseHigh", ctx) + " ";
    if (ctx.weightDelta !== null && ctx.weightDelta >= 0) {
      summary += getRandomPhrase("weightGainOrPlateau", ctx);
    }
    return summary.trim();
  }

  // Приоритет 2: Привес или Плато при нормальном пульсе
  if (ctx.weightDelta !== null && ctx.weightDelta >= 0) {
    summary += getRandomPhrase("weightGainOrPlateau", ctx) + " ";
    if (isTonusLow) {
      summary += getRandomPhrase("tonusLow", ctx);
    }
    return summary.trim();
  }

  // Приоритет 3: Отвес, но плохой тонус
  if (ctx.weightDelta !== null && ctx.weightDelta < 0 && isTonusLow) {
    summary += getRandomPhrase("weightLoss", ctx) + " Но " + getRandomPhrase("tonusLow", ctx);
    return summary.trim();
  }

  // Приоритет 4: Идеальный сценарий (Всё в норме, вес падает)
  summary += getRandomPhrase("pulseNormal", ctx) + " ";
  summary += getRandomPhrase("weightLoss", ctx) + " ";
  if (isTonusHigh) {
    summary += getRandomPhrase("tonusHigh", ctx);
  }

  return summary.trim();
};
