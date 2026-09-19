export const WATER_REFRACTORY_MIN = 45;

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
  // R6: единая станция, вычисленная хабом StateNowScreen (принимается без пересчёта)
  nextStationName?: string;
  nextStationTime?: string;
  // Legacy/compat — старые ключи больше не читаются, оставлены для типизации
  nowMinutes?: number;
  waterTargetMl?: number;
  mealsLoggedCount?: number;
  movementMinutes?: number;
  systemKeysDone?: number;
  schedule?: unknown;
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
    actionType?: "water" | "meal" | "activity" | "rest";
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
    nextStationName: hubStationName,
    nextStationTime: hubStationTime,
    timeZone,
  } = input;
  // Совместимость со старым контрактом StateNowScreen (до R3): маппим legacy поля
  const legacyWaterTarget = (input as any).waterTargetMl;
  const legacyMeals = (input as any).mealsLoggedCount;
  const legacyMovement = (input as any).movementMinutes;
  const effWaterTarget = Number.isFinite(legacyWaterTarget) ? legacyWaterTarget : waterTarget;
  const effCooked = Number.isFinite(legacyMeals) ? legacyMeals : cookedDishesCount;
  const effActivity = Number.isFinite(legacyMovement) ? legacyMovement : activityMinutes;

  // 1. Сон: 8 сегментов (каждый по 1 часу)
  const sleepHours = sleepMinutes / 60;
  const sleepTotalSeg = 8;
  const sleepLitSeg = Math.min(sleepTotalSeg, Math.max(0, Math.round(sleepHours)));
  const sleepPct = Math.min(100, Math.round((sleepMinutes / sleepTarget) * 100));

  // 2. Вода: 8 сегментов (стаканы) — используем effWaterTarget для совместимости
  // При наличии >= 180 мл зажигаем минимум 1 сегмент
  const waterGlassSize = Math.max(250, Math.round(effWaterTarget / 8));
  const waterTotalSeg = 8;
  const waterLitSeg = waterMl <= 0 ? 0 : Math.min(waterTotalSeg, Math.max(1, Math.floor(waterMl / (waterGlassSize * 0.75))));
  const waterPct = Math.min(100, Math.round((waterMl / effWaterTarget) * 100));

  // 3. Рацион: 4 сегмента (Завтрак, Обед, Ужин, Перекус/комплимент)
  const nutritionTotalSeg = 4;
  const nutritionLitSeg = Math.min(nutritionTotalSeg, Math.max(0, effCooked));
  const nutritionPct = Math.min(100, Math.round((nutritionLitSeg / nutritionTotalSeg) * 100));

  // 4. Движение: 6 сегментов (по 5 минут)
  const toneTotalSeg = 6;
  const toneLitSeg = effActivity > 0 ? Math.min(toneTotalSeg, Math.max(1, Math.round(effActivity / 5))) : 0;
  const tonePct = Math.min(100, Math.round((effActivity / activityTarget) * 100));

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

  // Определение фазы времени — синхронизировано с TZ хаба (R6)
  let hours: number;
  let minutes: number;
  let timeStr: string;
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      const h = Number(parts.find(p => p.type === "hour")?.value);
      const m = Number(parts.find(p => p.type === "minute")?.value);
      if (Number.isFinite(h) && Number.isFinite(m)) {
        hours = h === 24 ? 0 : h;
        minutes = m;
        timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      } else {
        const now = new Date();
        hours = now.getHours();
        minutes = now.getMinutes();
        timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      }
    } catch {
      const now = new Date();
      hours = now.getHours();
      minutes = now.getMinutes();
      timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  } else {
    const now = new Date();
    hours = now.getHours();
    minutes = now.getMinutes();
    timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

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

  // Умный фокус дня — R5: рефрактерный период воды 45 мин, строго блокируем «Выпить 250 мл воды»
  let focusText = "Выпить 250 мл воды";
  let focusGain = 3;

  const msSinceLastWater = lastWaterTimestamp ? Date.now() - lastWaterTimestamp : Infinity;
  const recentWaterDrink = msSinceLastWater < WATER_REFRACTORY_MIN * 60 * 1000;
  const isWaterText = (t: string) => {
    const low = t.toLowerCase();
    return low.includes("воды") || low.includes("250 мл");
  };

  if (recentWaterDrink) {
    // В рефрактерном периоде вода строго запрещена — отдаём приоритет еде/движению
    if (!hasBreakfast && hours < 12) {
      focusText = "Приготовить WFPB-завтрак";
      focusGain = 6;
    } else if (effActivity === 0 || activityMinutes === 0) {
      focusText = "Утренняя разминка (10 мин)";
      focusGain = 4;
    } else if (recommendedActionText && !isWaterText(recommendedActionText)) {
      focusText = recommendedActionText.replace(/\(\+\d+\%.*?\)/, "").trim();
    } else if (recommendedActionText && isWaterText(recommendedActionText)) {
      // рекомендованный nextStep — вода, но рефрактерный период активен: заменяем на нейтральный фокус
      focusText = "Утренняя разминка (10 мин)";
      focusGain = 4;
    }
    // если ни одно условие не сработало — остаётся предыдущий non-water fallback (не вода)
    if (isWaterText(focusText)) {
      focusText = hasBreakfast ? "Утренняя разминка (10 мин)" : "Приготовить WFPB-завтрак";
      focusGain = hasBreakfast ? 4 : 6;
    }
  } else if (recommendedActionText) {
    focusText = recommendedActionText.replace(/\(\+\d+\%.*?\)/, "").trim();
  }

  // R6: следующая станция — принимаем вычисленную хабом (StateNowScreen), без оторванной эвристики
  let nextStationName: string;
  let nextStationTime: string;
  if (hubStationName && hubStationTime) {
    nextStationName = hubStationName;
    nextStationTime = hubStationTime;
  } else {
    nextStationName = "Завтрак WFPB";
    nextStationTime = "по графику";
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
        valueText: `${effActivity} мин`,
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
      actionType: (() => {
        const low = focusText.toLowerCase();
        if (low.includes("вод")) return "water" as const;
        if (low.includes("завтрак") || low.includes("обед") || low.includes("ужин") || low.includes("блюд") || low.includes("сбор")) return "meal" as const;
        if (low.includes("размин") || low.includes("движен") || low.includes("зарядк")) return "activity" as const;
        return "rest" as const;
      })(),
    },
    nextStation: {
      title: "СЛЕДУЮЩАЯ СТАНЦИЯ",
      stationName: nextStationName,
      timeRemainingText: nextStationTime,
    },
  };
}