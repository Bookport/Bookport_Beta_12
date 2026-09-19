export interface WfpbGoldenRatioResult {
  badge: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  ratioString: string;
  description: string;
}

export function evaluateWfpbGoldenRatio(
  calories: number,
  protein: number,
  fat: number,
  carbs: number,
  fiber: number
): WfpbGoldenRatioResult {
  const calPro = (protein || 0) * 4;
  const calFat = (fat || 0) * 9;
  const calCarb = (carbs || 0) * 4;
  const macroSum = calPro + calFat + calCarb;

  // 1. Старт дня / Рацион ещё не сформирован
  if ((calories || 0) <= 200 || macroSum <= 150) {
    return {
      badge: "СТАРТ ДНЯ",
      badgeBg: "bg-slate-100",
      badgeText: "text-slate-700",
      badgeBorder: "border-slate-200",
      ratioString: "Ожидание приёмов пищи",
      description:
        "Рацион только начинается. Первый полноценный приём задаст правильный углеводный ритм и стабильный уровень энергии без резких перепадов сахара в крови.",
    };
  }

  const proPct = Math.round((calPro / macroSum) * 100);
  const fatPct = Math.round((calFat / macroSum) * 100);
  const carbPct = Math.max(0, 100 - proPct - fatPct);
  const ratioString = `${carbPct}% угл. · ${proPct}% бел. · ${fatPct}% жир.`;

  // 2. Высокая жировая плотность (> 25% калорий из жиров)
  if (fatPct > 25) {
    return {
      badge: "ИЗБЫТОК ЛИПИДОВ",
      badgeBg: "bg-rose-50",
      badgeText: "text-rose-700",
      badgeBorder: "border-rose-200",
      ratioString,
      description:
        "Доля жиров заметно превышает оптимум WFPB (10–15%). Плотные жиры замедляют выведение глюкозы из кровотока. В следующих приёмах дня отдайте предпочтение крупам, бобовым и зелени, исключив добавленные масла и ограничив семена.",
    };
  }

  // 3. Дефицит клетчатки при достаточном калораже (рафинированный рацион)
  if ((calories || 0) >= 800 && (fiber || 0) < 12) {
    return {
      badge: "НУЖНЫ ВОЛОКНА",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-700",
      badgeBorder: "border-amber-200",
      ratioString,
      description:
        "Калории поступают, но защитная сетка пищевых волокон недостаточна. Питание смещено в сторону очищенных продуктов. Подключите цельные бобовые, корнеплоды и свежую зелень для защиты микробиоты.",
    };
  }

  // 4. Белковый перевес (> 22% от калоража)
  if (proPct > 22) {
    return {
      badge: "БЕЛКОВЫЙ ПЕРЕКОС",
      badgeBg: "bg-indigo-50",
      badgeText: "text-indigo-700",
      badgeBorder: "border-indigo-200",
      ratioString,
      description:
        "Концентрация растительного белка превышает суточный оптимум WFPB, создавая лишнюю нагрузку на почки. Сбалансируйте последующие приёмы сочными овощами, цельными злаками и фруктами.",
    };
  }

  // 5. Дефицит сложных углеводов (< 55% калорий)
  if (carbPct < 55 && (calories || 0) >= 500) {
    return {
      badge: "УГЛЕВОДНЫЙ ДЕФИЦИТ",
      badgeBg: "bg-sky-50",
      badgeText: "text-sky-700",
      badgeBorder: "border-sky-200",
      ratioString,
      description:
        "В WFPB именно крахмалы и цельные зерновые служат основным чистым топливом для мозга и митохондрий. Добавьте в рацион гречку, овёс, бурый рис, чечевицу или печёный картофель.",
    };
  }

  // 6. Умеренное смещение по жирам (16–25%)
  if (fatPct >= 16 && fatPct <= 25) {
    return {
      badge: "ПЛОТНЫЙ РАЦИОН",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-800",
      badgeBorder: "border-amber-200",
      ratioString,
      description:
        "Доля жиров слегка повышена за счёт цельных растительных источников (орехи, семена, тофу, авокадо). Рацион качественный, но для поддержания высокой чувствительности к инсулину держите фокус на крупах и бобовых.",
    };
  }

  // 7. Акцент на клетчатке (мощный щит микробиоты)
  if ((fiber || 0) >= 30) {
    return {
      badge: "КЛЕТЧАТОЧНЫЙ ЩИТ",
      badgeBg: "bg-emerald-50",
      badgeText: "text-emerald-800",
      badgeBorder: "border-emerald-200",
      ratioString,
      description:
        "Отличный уровень пищевых волокон! Микробиота активно синтезирует короткоцепочечные жирные кислоты (бутират), обеспечивая ровный противовоспалительный фон и мягкую регуляцию сахара.",
    };
  }

  // 8. Эталонное золотое сечение WFPB (гармоничный оптимум)
  return {
    badge: "ЭТАЛОН WFPB",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-200",
    ratioString,
    description:
      "Идеальное золотое сечение цельного растительного питания. Энергия поступает вместе со сложными сетками клетчатки плавно и без инсулиновых спайков, сберегая ресурс поджелудочной железы.",
  };
}