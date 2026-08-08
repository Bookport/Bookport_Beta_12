// src/utils/digestionCoaching.ts

import { DigestionContext, DIGESTION_PHRASE_MATRIX, getRandomPhrase } from "./digestionPhrases";
import { DigestionEntry } from "../store/useAppStore";

export const getDigestionFeedback = (
  todayLogs: DigestionEntry[],
  waterEntries: any[],
  waterGoal: number,
  userName?: string,
  userGender?: string,
  periodAvgBristol?: number
): string => {
  // 1. Если логов нет
  if (!todayLogs || todayLogs.length === 0) {
    const ctx: DigestionContext = {
      userName,
      userGender,
      bristolAvg: null,
      lastBristol: null,
      symptomsCount: 0,
      symptomNames: [],
      hasWaterDeficit: false,
      comfortRatio: null,
      countLogs: 0,
    };
    return getRandomPhrase(DIGESTION_PHRASE_MATRIX.no_data.general)(ctx);
  }

  // 2. Сбор данных для контекста
  // Сортируем по времени, чтобы взять последний актуальный лог
  const sortedLogs = [...todayLogs].sort((a, b) => b.timestamp - a.timestamp);
  const latestLog = sortedLogs[0];
  
  // Определяем дефицит воды за сегодня
  const todayWater = waterEntries
    .filter(w => w.dayIndex === latestLog.dayIndex)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const hasWaterDeficit = todayWater < waterGoal;

  // Симптомы последнего лога
  const symptoms = latestLog.symptoms || [];
  const negativeSymptoms = symptoms.filter(s => s !== "Нет симптомов");

  // Формируем контекст
  const ctx: DigestionContext = {
    userName,
    userGender,
    bristolAvg: todayLogs.reduce((sum, log) => sum + log.bristolType, 0) / todayLogs.length,
    lastBristol: latestLog.bristolType,
    symptomsCount: negativeSymptoms.length,
    symptomNames: negativeSymptoms,
    hasWaterDeficit,
    comfortRatio: null, // Можно добавить расчет при необходимости
    countLogs: todayLogs.length,
  };

  // 3. Логика маршрутизации (дерево принятия решений)
  const bristol = ctx.lastBristol!;

  let trendSuffix = "";
  if (periodAvgBristol !== undefined && periodAvgBristol !== null) {
    const diff = bristol - periodAvgBristol;
    // Значимое расхождение со средним
    if (Math.abs(diff) >= 1.0) {
      if (Math.abs(bristol - 4) < Math.abs(periodAvgBristol - 4)) {
        trendSuffix = " Это явный прогресс по сравнению с твоей средней статистикой за период!";
      } else {
        trendSuffix = " Обрати внимание, этот замер сильно отличается от твоего среднего тренда.";
      }
    }
  }

  let phrase = "";

  // 3.1 Замедленный транзит / Запор (1, 2)
  if (bristol === 1 || bristol === 2) {
    if (ctx.hasWaterDeficit) {
      phrase = getRandomPhrase(DIGESTION_PHRASE_MATRIX.constipation.dehydrated)(ctx);
    } else {
      phrase = getRandomPhrase(DIGESTION_PHRASE_MATRIX.constipation.hydrated)(ctx);
    }
  }

  // 3.2 Ускоренный транзит / Диарея (6, 7)
  else if (bristol === 6 || bristol === 7) {
    phrase = getRandomPhrase(DIGESTION_PHRASE_MATRIX.diarrhea.general)(ctx);
  }

  // 3.3 Идеальный транзит (3, 4, 5)
  else {
    if (ctx.symptomsCount > 0) {
      phrase = getRandomPhrase(DIGESTION_PHRASE_MATRIX.ideal_transit.with_symptoms)(ctx);
    } else {
      phrase = getRandomPhrase(DIGESTION_PHRASE_MATRIX.ideal_transit.perfect)(ctx);
    }
  }

  return phrase + trendSuffix;
};
