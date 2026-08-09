// src/utils/digestionCoaching.ts

import { DigestionContext, DIGESTION_PHRASE_MATRIX, getRandomPhrase } from "./digestionPhrases";
import { DailySummary } from "./crossModuleSummary";

export const getDigestionFeedback = (
  summary: DailySummary,
  userName?: string,
  userGender?: string
): string => {
  const digestion = summary.digestion;
  const water = summary.water;
  const movement = summary.movement;
  const measurements = summary.measurements;

  const ctx: DigestionContext = {
    userName,
    userGender,
    summary,
  };

  // 1. Если логов нет
  if (!digestion || digestion.episodes === 0 || digestion.latestBristol === null) {
    return getRandomPhrase(DIGESTION_PHRASE_MATRIX.no_data.general)(ctx);
  }

  // 2. Кросс-триггеры (дерево принятия решений на основе единой сводки)
  const status = digestion.status;

// 2.1 Замедленный транзит / Запор (тип 1, 2)
if (status === "constipation") {
  // Триггер "Вода": запор + дефицит воды -> самая критичная связка
  if (water.status === "deficit") {
    return getRandomPhrase(DIGESTION_PHRASE_MATRIX.constipation.dehydrated)(ctx);
  }
  // Триггер "Движение": запор + малоподвижность
  if (movement.status === "sedentary") {
    return getRandomPhrase(DIGESTION_PHRASE_MATRIX.constipation.sedentary)(ctx);
  }
  // Триггер "Тонус": запор + низкий тонус
  if (measurements.tonus === "low") {
    return getRandomPhrase(DIGESTION_PHRASE_MATRIX.constipation.low_tonus)(ctx);
  }
  // Обычный запор (вода и активность в норме)
  return getRandomPhrase(DIGESTION_PHRASE_MATRIX.constipation.hydrated)(ctx);
}

if (status === "diarrhea") {
  // Триггер "Вода": диарея + дефицит воды -> организм теряет жидкость
  if (water.status === "deficit") {
    return getRandomPhrase(DIGESTION_PHRASE_MATRIX.diarrhea.deficit)(ctx);
  }
  return getRandomPhrase(DIGESTION_PHRASE_MATRIX.diarrhea.general)(ctx);
}

  // 2.3 Идеальный транзит (тип 3, 4, 5)
  // Триггер "Тонус": идеальный стул + низкая энергия -> питание/отдых
  if (measurements.tonus === "low") {
    return getRandomPhrase(DIGESTION_PHRASE_MATRIX.ideal_transit.low_energy)(ctx);
  }
  // Идеальный стул + есть симптомы
  if (digestion.symptoms.length > 0) {
    return getRandomPhrase(DIGESTION_PHRASE_MATRIX.ideal_transit.with_symptoms)(ctx);
  }
  // Идеальный стул, все остальное в норме
  return getRandomPhrase(DIGESTION_PHRASE_MATRIX.ideal_transit.perfect)(ctx);
};
