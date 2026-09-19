export interface BioDialInput {
  waterMl: number;
  waterTarget: number;
  sleepMinutes: number;
  sleepTarget?: number;
  cookedDishesCount: number;
  activityMinutes: number;
  activityTarget?: number;
  habitsDone?: number;
  habitsTarget?: number;
  timeZone?: string;
  // Реальные факты приёмов пищи и времени
  hasBreakfast?: boolean;
  hasLunch?: boolean;
  hasDinner?: boolean;
  lastWaterTimestamp?: number;
  recommendedActionText?: string;
}

export interface RingData {
  litSegments: number;
  totalSegments: number;
  valueText: string;
  percent: number;
}

export interface BioDialOutput {
  integralScore: number;
  rings: {
    sleep: RingData;
    water: RingData;
    nutrition: RingData;
    movement: RingData;
  };
  timePhase: {
    timeStr: string;
    phaseLabel: string;
    dotColor: string;
  };
  diagnosis: {
    title: string;
    subtitle: string;
    badgeStyle: string;
    dotColor: string;
  };
  focusAction: {
    title: string;
    text: string;
    gainPct: number;
  };
  nextStation: {
    title: string;
    stationName: string;
    timeRemainingText: string;
  };
}

export function calculateBioDialAdvice(input: BioDialInput): BioDialOutput {
  const {
    waterMl = 0,
    waterTarget = 2400,
    sleepMinutes = 0,
    sleepTarget = 480, // 8 часов
    cookedDishesCount = 0,
    activityMinutes = 0,
    activityTarget = 30, // 30 минут
    hasBreakfast = false,
    hasLunch = false,
    hasDinner = false,
    lastWaterTimestamp,
    recommendedActionText,
  } = input;

  // 1. Сон: 8 сегментов (каждый по 1 часу)
  const sleepHours = sleepMinutes / 60;
  const sleepTotalSeg = 8;
  const sleepLitSeg = Math.min(sleepTotalSeg, Math.max(0, Math.round(sleepHours)));
  const sleepPct = Math.min(100, Math.round((sleepMinutes / sleepTarget) * 100));

  // 2. Вода: 8 сегментов (стаканы)
  // При наличии >= 180 мл зажигаем минимум 1 сегмент
  const waterGlassSize = Math.max(250, Math.round(waterTarget / 8));
  const waterTotalSeg = 8;
  const waterLitSeg = waterMl <= 0 ? 0 : Math.min(waterTotalSeg, Math.max(1, Math.floor(waterMl / (waterGlassSize * 0.75))));
  const waterPct = Math.min(100, Math.round((waterMl / waterTarget) * 100));

  // 3. Рацион: 4 сегмента (Завтрак, Обед, Ужин, Перекус/комплимент)
  const nutritionTotalSeg = 4;
  const nutritionLitSeg = Math.min(nutritionTotalSeg, Math.max(0, cookedDishesCount));
  const nutritionPct = Math.min(100, Math.round((nutritionLitSeg / nutritionTotalSeg) * 100));

  // 4. Движение: 6 сегментов (по 5 минут)
  const toneTotalSeg = 6;
  const toneLitSeg = activityMinutes > 0 ? Math.min(toneTotalSeg, Math.max(1, Math.round(activityMinutes / 5))) : 0;
  const tonePct = Math.min(100, Math.round((activityMinutes / activityTarget) * 100));

  // Честный интегральный баланс суток: сумма 4 осей (каждая до 25%)
  const integralScore = Math.min(
    100,
    Math.round(
      (sleepLitSeg / sleepTotalSeg) * 25 +
      (waterLitSeg / waterTotalSeg) * 25 +
      (nutritionLitSeg / nutritionTotalSeg) * 25 +
      (toneLitSeg / toneTotalSeg) * 25
    )
  );

  // Определение фазы времени
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  let phaseLabel = "Утренний ритм";
  let phaseDot = "bg-sky-500";
  if (hours >= 12 && hours < 17) {
    phaseLabel = "Дневной баланс";
    phaseDot = "bg-emerald-500";
  } else if (hours >= 17 && hours < 22) {
    phaseLabel = "Вечерний ритм";
    phaseDot = "bg-indigo-500";
  } else if (hours >= 22 || hours < 6) {
    phaseLabel = "Фаза отдыха";
    phaseDot = "bg-purple-500";
  }

  // Диагностика состояния
  let diagTitle = "Ровный ход дня";
  let diagSub = "Показатели синхронизированы";
  let diagBadge = "bg-emerald-50/90 border-emerald-200/80 text-emerald-900";
  let diagDot = "bg-emerald-500";

  if (waterLitSeg < 2 && hours >= 13) {
    diagTitle = "Низкая гидратация";
    diagSub = "Клеткам требуется вода";
    diagBadge = "bg-amber-50/90 border-amber-200/80 text-amber-900";
    diagDot = "bg-amber-500";
  } else if (sleepLitSeg < 6 && sleepMinutes > 0) {
    diagTitle = "Дефицит сна";
    diagSub = "Режим мягкого восстановления";
    diagBadge = "bg-rose-50/90 border-rose-200/80 text-rose-900";
    diagDot = "bg-rose-500";
  }

  // Умный фокус дня (не пинаем пить воду, если стакан был недавно)
  let focusText = "Выпить 250 мл воды";
  let focusGain = 3;

  const msSinceLastWater = lastWaterTimestamp ? Date.now() - lastWaterTimestamp : Infinity;
  const recentWaterDrink = msSinceLastWater < 45 * 60 * 1000; // меньше 45 минут назад

  if (recentWaterDrink && !hasBreakfast && hours < 12) {
    focusText = "Приготовить WFPB-завтрак";
    focusGain = 6;
  } else if (recentWaterDrink && activityMinutes === 0) {
    focusText = "Утренняя разминка (10 мин)";
    focusGain = 4;
  } else if (recommendedActionText) {
    focusText = recommendedActionText.replace(/\(\+\d+\%.*?\)/, "").trim();
  }

  // Умная следующая станция (опираемся на реальные приёмы пищи)
  let nextStationName = "Завтрак WFPB";
  let nextStationTime = "по графику";

  if (!hasBreakfast && hours < 12) {
    nextStationName = "Завтрак WFPB";
    nextStationTime = "до 11:30";
  } else if (!hasLunch && hours < 16) {
    nextStationName = "Обед WFPB";
    nextStationTime = "13:00 – 15:00";
  } else if (!hasDinner && hours < 21) {
    nextStationName = "Ужин WFPB";
    nextStationTime = "18:30 – 20:00";
  } else {
    nextStationName = "Отдых ЖКТ и сон";
    nextStationTime = "после 21:30";
  }

  return {
    integralScore,
    rings: {
      sleep: {
        litSegments: sleepLitSeg,
        totalSegments: sleepTotalSeg,
        valueText: `${sleepHours.toFixed(1)} ч`,
        percent: sleepPct,
      },
      water: {
        litSegments: waterLitSeg,
        totalSegments: waterTotalSeg,
        valueText: `${waterMl} мл`,
        percent: waterPct,
      },
      nutrition: {
        litSegments: nutritionLitSeg,
        totalSegments: nutritionTotalSeg,
        valueText: `${nutritionLitSeg} из 4`,
        percent: nutritionPct,
      },
      movement: {
        litSegments: toneLitSeg,
        totalSegments: toneTotalSeg,
        valueText: `${activityMinutes} мин`,
        percent: tonePct,
      },
    },
    timePhase: {
      timeStr,
      phaseLabel,
      dotColor: phaseDot,
    },
    diagnosis: {
      title: diagTitle,
      subtitle: diagSub,
      badgeStyle: diagBadge,
      dotColor: diagDot,
    },
    focusAction: {
      title: "ФОКУС",
      text: focusText,
      gainPct: focusGain,
    },
    nextStation: {
      title: "СЛЕДУЮЩАЯ СТАНЦИЯ",
      stationName: nextStationName,
      timeRemainingText: nextStationTime,
    },
  };
}