export interface MicronutrientValues {
  dayVitA: number;
  dayVitC: number;
  dayVitB9: number;
  dayVitE: number;
  dayVitK: number;
  dayIron: number;
  dayMagnesium: number;
  dayZinc: number;
  dayPotassium: number;
  dayLysine: number;
  daySelenium: number;
  hasAnyRealMicronutrientProfile?: boolean;
}

export interface MicronutrientIntegrationResult {
  badge: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  headline: string;
  description: string;
}

export function evaluateMicronutrientIntegration(
  data: MicronutrientValues
): MicronutrientIntegrationResult {
  const {
    dayVitA = 0,
    dayVitC = 0,
    dayVitB9 = 0,
    dayVitE = 0,
    dayVitK = 0,
    dayIron = 0,
    dayMagnesium = 0,
    dayZinc = 0,
    dayPotassium = 0,
    dayLysine = 0,
    daySelenium = 0,
    hasAnyRealMicronutrientProfile = false,
  } = data;

  const allValues = [
    dayVitA,
    dayVitC,
    dayVitB9,
    dayVitE,
    dayVitK,
    dayIron,
    dayMagnesium,
    dayZinc,
    dayPotassium,
    dayLysine,
    daySelenium,
  ];

  const avgValue =
    allValues.reduce((sum, val) => sum + (val || 0), 0) / allValues.length;

  // 1. Старт дня или рацион без микронутриентного профиля
  if (!hasAnyRealMicronutrientProfile || avgValue < 12) {
    return {
      badge: "ОЖИДАНИЕ ПРИЁМА",
      badgeBg: "bg-slate-100",
      badgeText: "text-slate-700",
      badgeBorder: "border-slate-200",
      headline: "Клеточное насыщение в фазе старта",
      description:
        "Микронутриентный контур готов к приёму нутриентов. Первое цельное растительное блюдо запустит ферментные каскады и обеспечит базовое поступление минералов.",
    };
  }

  // 2. Мощный электролитный дуэт (Калий + Магний)
  if (dayPotassium >= 55 && dayMagnesium >= 55) {
    return {
      badge: "КАЛИЙ-МАГНИЕВЫЙ РЕСУРС",
      badgeBg: "bg-teal-50",
      badgeText: "text-teal-800",
      badgeBorder: "border-teal-200",
      headline: "Стабилизация сосудистого и нервного тонуса",
      description:
        "Высокая концентрация органического калия расслабляет гладкую мускулатуру артериол и нивелирует задержку жидкости, а магний мягко деактивирует стресс-реактивность центральной нервной системы.",
    };
  }

  // 3. Антиоксидантный щит (Витамин C + Селен или Витамин E)
  if (dayVitC >= 85 && (daySelenium >= 35 || dayVitE >= 35)) {
    return {
      badge: "АНТИОКСИДАНТНЫЙ ЩИТ",
      badgeBg: "bg-emerald-50",
      badgeText: "text-emerald-800",
      badgeBorder: "border-emerald-200",
      headline: "Защита сосудистого эндотелия",
      description:
        "Синергия натурального витамина C, токоферолов и селена блокирует перекисное окисление липидов, стимулирует выработку оксида азота (NO) и защищает внутреннюю выстилку капилляров.",
    };
  }

  // 4. Импульс кроветворения (Железо Fe + Фолаты B9)
  if (dayIron >= 60 && dayVitB9 >= 60) {
    return {
      badge: "ФОЛАТЫ И КРОВЕТВОРЕНИЕ",
      badgeBg: "bg-rose-50",
      badgeText: "text-rose-800",
      badgeBorder: "border-rose-200",
      headline: "Эритропоэз и клеточное деление",
      description:
        "Негемовое железо из бобовых и зелени в сопровождении растительных фолатов включается в дыхательную цепь клеток без окислительного стресса, присущего изолированным добавкам железа.",
    };
  }

  // 5. Иммуно-структурный фокус (Цинк + Лизин + Витамин A)
  if (dayZinc >= 50 && (dayLysine >= 60 || dayVitA >= 40)) {
    return {
      badge: "СТРУКТУРНЫЙ ИММУНИТЕТ",
      badgeBg: "bg-indigo-50",
      badgeText: "text-indigo-800",
      badgeBorder: "border-indigo-200",
      headline: "Синтез коллагена и барьерная защита",
      description:
        "Биодоступный цинк в сочетании с незаменимым лизином ускоряет регенерацию слизистой ЖКТ, поддерживает Т-клеточный иммунный ответ и стабильность соединительных тканей.",
    };
  }

  // 6. Базовый системный биобаланс
  return {
    badge: "СИСТЕМНЫЙ БИОБАЛАНС",
    badgeBg: "bg-indigo-50/80",
    badgeText: "text-indigo-800",
    badgeBorder: "border-indigo-200",
    headline: "Сбалансированная нутриентная матрица",
    description:
      "Рацион равномерно насыщает ткани микроэлементами в их естественной органической форме, активируя синтез собственных антиоксидантных ферментов без медикаментозных перегрузок.",
  };
}