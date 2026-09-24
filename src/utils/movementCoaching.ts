import { MovementContext, MOVEMENT_PHRASES } from "./movementPhrases";
import { DailySummary } from "./crossModuleSummary";
import { MovementEntry } from "../store/useAppStore";
import { ACTIVITY_CONFIGS } from "../constants/movement";
import { getMovementGoal } from "./movementUtils";
import type { FoodSummary } from "../services/foodSummary";

export interface MovementAdviceResult {
  text: string;
  glowBorderClass: string;
  statusBadge: string;
  label: string;
}

const LEVEL_STYLES = {
  zero: {
    glowBorderClass: "border-[#94A3B8] shadow-slate-150/50 shadow-md",
    statusBadge: "bg-slate-100 text-slate-700",
    label: "Проверьте запись",
  },
  noData: {
    glowBorderClass: "border-[#94A3B8] shadow-slate-150/50 shadow-md",
    statusBadge: "bg-slate-100 text-slate-700",
    label: "Нет записей",
  },
  low: {
    glowBorderClass: "border-[#FACC15] shadow-[#FEF08A]/75 shadow-md",
    statusBadge: "bg-[#FEF08A] text-[#854D0E]",
    label: "Начало положено",
  },
  progress: {
    glowBorderClass: "border-[#A78BFA] shadow-[#DDD6FE]/75 shadow-md",
    statusBadge: "bg-[#EDE9FE] text-[#6D28D9]",
    label: "Хороший темп",
  },
  done: {
    glowBorderClass: "border-[#10B981] shadow-[#A7F3D0]/75 shadow-md",
    statusBadge: "bg-[#D1FAE5] text-[#065F46]",
    label: "Цель выполнена",
  },
  overactive: {
    glowBorderClass: "border-[#F97316] shadow-[#FDBA74]/75 shadow-md",
    statusBadge: "bg-[#FFEDD5] text-[#C2410C]",
    label: "Сверхактивность!",
  },
};

const stableMovementPhrase = (category: keyof typeof MOVEMENT_PHRASES, ctx: MovementContext): string => {
  const variants = MOVEMENT_PHRASES[category];
  if (!variants.length) return "";
  const seed = `${ctx.summary.dayIndex}|${category}|${ctx.activeMinutes}|${ctx.activityTypes.join(",")}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619) >>> 0;
  return variants[hash % variants.length](ctx);
};

const minuteWord = (value: number): string => {
  const n = Math.abs(Math.trunc(value));
  if (n % 100 >= 11 && n % 100 <= 14) return "минут";
  if (n % 10 === 1) return "минута";
  if (n % 10 >= 2 && n % 10 <= 4) return "минуты";
  return "минут";
};

const minutesText = (value: number): string => `${value} ${minuteWord(value)}`;
const entryWord = (value: number): string => {
  if (value % 100 >= 11 && value % 100 <= 14) return "записей";
  if (value % 10 === 1) return "запись";
  if (value % 10 >= 2 && value % 10 <= 4) return "записи";
  return "записей";
};

const activityDescription = (key: string): string => {
  switch (key) {
    case "Walk": return "Прогулка записана: это движение в обычном ритме дня; скорость и усилие журнал не измеряет.";
    case "Gymnastics": return "Зарядка записана. Название сессии не показывает её интенсивность или сложность упражнений.";
    case "Stretching": return "Растяжка записана. По длительности нельзя оценить амплитуду, технику или переносимость движения.";
    case "Yoga": return "Йога записана; характер упражнений и их усилие в дневной сумме минут не раскрыты.";
    case "Cardio": return "Кардио записано, но одна длительность не определяет интенсивность или восстановление.";
    case "Strength": return "Силовая тренировка записана; дневник минут не показывает веса, подходы и величину усилия.";
    case "Cycling": return "Велосипед записан. По времени сессии нельзя судить о темпе и сопротивлении.";
    case "Dancing": return "Танцы записаны. Длительность известна, а интенсивность и переносимость — нет.";
    case "Mobility": return "Работа над подвижностью записана; по минутам нельзя определить амплитуду или ощущения.";
    case "Custom": return "Своя активность записана. О её интенсивности и содержании в журнале нет отдельных данных.";
    default: return "Вид активности записан; одно название не позволяет оценить интенсивность нагрузки.";
  }
};

export const generateMovementSummary = (
  summary: DailySummary,
  userName?: string,
  userGender?: string,
  movementEntries: MovementEntry[] = [],
  foodSummary?: FoodSummary,
  isCurrentDay: boolean = true
): MovementAdviceResult => {
  const activeMinutes = summary.movement.activeMin;
  const dailyGoal = getMovementGoal();
  const percent = dailyGoal > 0 ? (activeMinutes / dailyGoal) * 100 : 0;
  const hasEntries = summary.movement.hasEntries || movementEntries.length > 0;
  const activityTypes = summary.movement.activityTypes.length > 0
    ? summary.movement.activityTypes
    : Array.from(new Set(movementEntries
      .map(entry => (entry.type || entry.activityType || "").trim())
      .filter(Boolean)));
  const water = summary.water;
  const measurements = summary.measurements;
  const digestion = summary.digestion;
  const hasRecordedSymptoms = digestion.symptoms.length > 0;
  const lowerTonus = measurements.tonus === "low";
  const caution = lowerTonus || hasRecordedSymptoms;
  const waterPercent = water.goal > 0 ? water.pct : 0;
  const streak = (summary.movement as { activeStreak?: number }).activeStreak ?? 0;

  const ctx: MovementContext = {
    userName,
    userGender: userGender as "male" | "female" | undefined,
    summary,
    activeMinutes,
    dailyGoal,
    activityTypes,
    streak,
    waterPercent,
    pulse: measurements.latestPulse,
    weightDelta: measurements.weightDelta,
  };

  const style = activeMinutes === 0 && !hasEntries
    ? LEVEL_STYLES.noData
    : activeMinutes >= 60
      ? LEVEL_STYLES.overactive
      : activeMinutes === 0
        ? LEVEL_STYLES.zero
        : percent < 50
          ? LEVEL_STYLES.low
          : percent < 100
            ? LEVEL_STYLES.progress
            : LEVEL_STYLES.done;
  const withStyle = (parts: string[]): MovementAdviceResult => ({
    text: parts.filter(Boolean).join("\n\n"),
    glowBorderClass: style.glowBorderClass,
    statusBadge: style.statusBadge,
    label: style.label,
  });

  if (activeMinutes === 0) {
    if (!hasEntries) {
      return withStyle([isCurrentDay
        ? "За сегодня пока нет записей движения. Если активность уже была, добавь её в дневник."
        : "За выбранный день нет записей движения. Это не означает, что движения не было; при необходимости дополни дневник."]);
    }
    return withStyle([isCurrentDay
      ? "В сводке за сегодня отмечено 0 минут движения. Если активность была, проверь длительность записи."
      : "В сводке за выбранный день отмечено 0 минут движения. Если активность была, проверь длительность записи."]);
  }

  const parts: string[] = [];
  const completed = activeMinutes >= dailyGoal;
  const recorded = `${minutesText(activeMinutes)} движения при ориентире ${minutesText(dailyGoal)}`;
  if (!isCurrentDay) {
    parts.push(completed
      ? `За выбранный день записано ${recorded}. Дневной ориентир достигнут; дополнительных минут за прошлый день не требуется.`
      : `За выбранный день записано ${recorded}. До ориентира не хватило ${minutesText(dailyGoal - activeMinutes)}; это итог прошлого дня, а не задача на сейчас.`);
  } else if (caution) {
    parts.push(completed
      ? `Сегодня записано ${recorded}. Ориентир выполнен, но отмеченное самочувствие важнее предложения увеличить нагрузку.`
      : `Сегодня записано ${recorded}. Ориентир ещё не достигнут, но при отмеченном самочувствии не стоит добирать минуты любой ценой.`);
  } else if (completed) {
    parts.push(`Сегодня записано ${recorded}: ориентир выполнен. ${stableMovementPhrase("movementGoalReached_Base", ctx)}`);
  } else {
    const safeNextStep = `До ориентира остаётся ${minutesText(dailyGoal - activeMinutes)}. Если самочувствие позволяет, выбирай посильное движение без требования немедленно закрыть план.`;
    // Старые фразы этих категорий требуют нагрузки и могут противоречить данным о самочувствии.
    // Категории сохранены в словаре для следующего пофайлового обновления; сейчас безопаснее назвать факт.
    parts.push(`Сегодня записано ${recorded}. ${safeNextStep}`);
  }

  const normalizeActivityType = (raw: string): string => {
    const match = Object.entries(ACTIVITY_CONFIGS).find(([key, config]) => key === raw || config.name === raw);
    return match ? match[0] : raw;
  };
  const normalizedTypes = Array.from(new Set(activityTypes.map(normalizeActivityType)));
  const orderedEntries = [...movementEntries].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  const lastEntry = orderedEntries[orderedEntries.length - 1];
  const lastRaw = (lastEntry?.type || lastEntry?.activityType || activityTypes[activityTypes.length - 1] || "").trim();
  const typeKey = lastRaw ? normalizeActivityType(lastRaw) : "";
  if (normalizedTypes.length > 1) {
    const names = normalizedTypes.map(key => ACTIVITY_CONFIGS[key]?.name || key);
    const listed = names.length === 2 ? names.join(" и ") : `${names.slice(0, -1).join(", ")} и ${names[names.length - 1]}`;
    const period = isCurrentDay ? "Сегодня" : "За выбранный день";
    parts.push(`${period} отмечены ${listed}. Указанные выше минуты — общий итог сессий, а не длительность только последней из них.`);
  } else if (typeKey) {
    const typePhraseKey = `movementType_${typeKey}`;
    if (typePhraseKey in MOVEMENT_PHRASES && !caution) {
      parts.push(stableMovementPhrase(typePhraseKey as keyof typeof MOVEMENT_PHRASES, ctx));
    } else {
      parts.push(activityDescription(typeKey));
    }
  }

  const context: string[] = [];
  if (lowerTonus) {
    context.push("В замерах этого дня отмечен сниженный тонус. При выборе следующей активности ориентируйся на самочувствие, а не на остаток минут.");
  } else if (measurements.tonus === "high" || measurements.tonus === "normal") {
    context.push(`Тонус в дневнике отмечен как ${measurements.tonus === "high" ? "повышенный" : "обычный"}.`);
  }
  const pressure: string[] = [];
  if (measurements.systolic !== null) pressure.push(`систолическое ${measurements.systolic}`);
  if (measurements.diastolic !== null) pressure.push(`диастолическое ${measurements.diastolic}`);
  if (measurements.latestPulse !== null) pressure.push(`пульс ${measurements.latestPulse} уд/мин`);
  if (pressure.length > 0) {
    // Поля давления могут происходить из разных записей одного дня: не объявляем их единым замером.
    context.push(`В замерах выбранного дня: ${pressure.join(", ")}. Если самочувствие после занятия меняется, отмечай это отдельно от длительности сессии.`);
  }
  if (context.length > 0 && (lowerTonus || hasRecordedSymptoms || pressure.length > 0 || water.amount <= 0)) {
    parts.push(context.join(" "));
  }

  const giFacts: string[] = [];
  if (digestion.episodes > 0) {
    giFacts.push(`${digestion.episodes} ${entryWord(digestion.episodes)} ЖКТ`);
    if (digestion.latestBristol !== null) giFacts.push(`последний тип по Бристолю — ${digestion.latestBristol}`);
    if (hasRecordedSymptoms) giFacts.push("также отмечены симптомы");
    if (digestion.latestComfort === "hard") giFacts.push("последний эпизод отмечен как затруднённый");
  }
  if (giFacts.length > 0 && (hasRecordedSymptoms || digestion.latestComfort === "hard" || digestion.status === "constipation" || digestion.status === "diarrhea")) {
    parts.push(`В дневнике за тот же день: ${giFacts.join(", ")}. Движение не объясняет причину этих записей; при дискомфорте не форсируй нагрузку ради нормы минут.`);
  }

  if (water.amount > 0 && water.goal > 0) {
    const amount = Math.round(water.amount);
    const goal = Math.round(water.goal);
    const daily = `${amount} мл из дневной цели ${goal} мл (${waterPercent}% всей цели)`;
    const hasTimeGoal = isCurrentDay && water.timePct !== null && water.expectedGoalOnNow !== null && water.expectedGoalOnNow > 1;
    if (waterPercent < 100 || (hasTimeGoal && water.timePct !== null && water.timePct < 100)) {
      const timing = hasTimeGoal && water.timePct !== null
        ? ` К текущему часу это ${water.timePct}% расчётного графика — не процент всей дневной цели.`
        : "";
      const nextStep = isCurrentDay && hasTimeGoal && water.timePct !== null && water.timePct >= 100
        ? "Текущий график соблюдён, хотя суточная цель ещё открыта; нет повода компенсировать её разом."
        : isCurrentDay
          ? "Если обычно пьёшь воду в течение дня, проверь следующую привычную возможность без попытки резко добрать разницу."
          : "Это итог выбранного дня, а не просьба догонять его сейчас.";
      parts.push(`По воде записано ${daily}.${timing} ${nextStep}`);
    }
  }

  if (foodSummary && foodSummary.dayIndex === summary.dayIndex) {
    if (foodSummary.mealCount === 0) {
      parts.push(isCurrentDay
        ? "За этот день в архиве «Мои блюда» пока нет приготовленных и съеденных блюд."
        : "За выбранный день в архиве «Мои блюда» нет записи о съеденном блюде.");
    } else {
      // По продуктовому контракту попадание приготовленного блюда в «Мои блюда» фиксирует его употребление.
      // createdAt — время употребления, если оно валидно; при legacy-null порядок с движением не восстанавливаем.
      const timed = foodSummary.dishes.filter(dish => dish.createdAt && Number.isFinite(Date.parse(dish.createdAt)));
      const lastDish = timed.length > 0
        ? [...timed].sort((a, b) => Date.parse(b.createdAt as string) - Date.parse(a.createdAt as string))[0]
        : foodSummary.dishes[foodSummary.dishes.length - 1];
      if (lastDish) {
        const name = lastDish.name.trim() || "блюдо без названия";
        // Приложение считает сохранённое приготовленное блюдо съеденным в момент createdAt.
        // Слот из FoodSummary определяется только часами и не равен выбранному пользователем
        // названию приёма пищи. В комментарии Движения называем время, но не слот.
        const mealMoment = lastDish.timeLocal
          ? `В ${lastDish.timeLocal} съедено блюдо «${name}».`
          : isCurrentDay
            ? `Сегодня съедено блюдо «${name}»; время его употребления в записи недоступно.`
            : `За выбранный день съедено блюдо «${name}»; время его употребления в записи недоступно.`;
        const savedNames = lastDish.ingredients.map(ingredient => ingredient.name.trim()).filter(Boolean);
        const ingredients = savedNames.length > 0
          ? ` В сохранённом составе: ${savedNames.slice(0, 3).join(", ")}${savedNames.length > 3 ? " и другие ингредиенты" : ""}.`
          : "";
        const fiber = lastDish.fiber !== null && Number.isFinite(lastDish.fiber)
          ? ` Для этого блюда записано ${Number(lastDish.fiber.toFixed(1))} г клетчатки.` : "";
        const otherMeals = foodSummary.mealCount > 1
          ? ` Всего в дневнике этого дня ${foodSummary.mealCount} сохранённых блюд, которые по правилам приложения считаются съеденными.`
          : "";
        const dailyFiber = foodSummary.strictMealCount > 0 && foodSummary.strictTotals.fiber > 0
          && (foodSummary.mealCount > 1 || lastDish.fiber === null)
          ? ` По блюдам с полным расчётом за день учтено ${Number(foodSummary.strictTotals.fiber.toFixed(1))} г клетчатки.`
          : "";
        const incomplete = !lastDish.includedInStrictMacros ? " Часть пищевых показателей блюда не заполнена, поэтому не приписывай ему дневной итог." : "";
        parts.push(`${mealMoment}${ingredients}${fiber}${otherMeals}${dailyFiber}${incomplete}`);
      }
    }
  }

  // Текст не превращаем в перечисление всех модулей: сначала состояние и ЖКТ,
  // затем контексты замеров, ЖКТ, воды и еды — только когда для них есть дневные записи.
  const primary = parts.slice(0, typeKey ? 2 : 1);
  const secondary = parts.slice(primary.length);
  return withStyle([...primary, ...secondary.slice(0, 4)]);
};
