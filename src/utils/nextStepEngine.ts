import { NormalizedIngredient } from "../services/DailyNutritionStore";
import { getPlural } from "./pluralize";
import { WATER_ACTIVE_START_MIN, WATER_ACTIVE_WINDOW_MIN } from "./waterGoal";

export interface NextStepInput {
  water: number;
  waterPct: number;
  waterTarget: number;
  sleep: number;
  sleepPct: number;
  mealCount: number;
  mealsPct: number;
  habitsDone: number;
  habitsPct: number;
  integralScore: number;
  ratingWellbeing: number;
  ratingEnergy: number;
  ratingLightness: number;
  currentDayIndex: number;
  aggregatedIngredients: { name: string; weight: number; status: "green" | "yellow" | "red" }[];
  dayNotes: { text: string; time: string; source?: string }[];
  selectedChronic: string[];
  totalFiber: number;
  totalCalories: number;
  lastWaterTimestamp?: number;
  todayWaterEntries?: { amount: number; timestamp: number }[];
  activityMinutes?: number;
}

export interface NextStepRecommendation {
  title: string;
  desc: string;
  icon: string;
  btnText: string;
  actionType: "water" | "meals" | "habits" | "sleep" | "diary" | "what-i-eat" | "book-recipes" | "notes";
  reasoning: string;
}

/**
 * Universal dynamic priority-based system for electing the absolute best next step
 * based on the entire daily state of the user.
 */
export function getRecommendedNextStep(input: NextStepInput): NextStepRecommendation {
  const {
    water,
    waterPct,
    waterTarget,
    sleep,
    sleepPct,
    mealCount,
    mealsPct,
    habitsDone,
    habitsPct,
    integralScore,
    ratingWellbeing,
    ratingEnergy,
    ratingLightness,
    currentDayIndex,
    aggregatedIngredients = [],
    dayNotes = [],
    selectedChronic = [],
    totalFiber = 0,
    totalCalories = 0,
    activityMinutes = 0,
  } = input;

  const notesTextLower = dayNotes.map(n => (n.text || "").toLowerCase()).join(" ");
  const hasChronicPressure = selectedChronic.some(c => 
    c.toLowerCase().includes("давлен") || 
    c.toLowerCase().includes("гипертон") || 
    c.toLowerCase().includes("сосуд")
  );
  
  // Look for any non-WFPB or red items that user recorded
  const redIngredients = aggregatedIngredients.filter(ing => ing.status === "red");
  const yellowIngredients = aggregatedIngredients.filter(ing => ing.status === "yellow");

  // Detect if the user already consumed neutralizing leafy greens / fibers
  const hasNeutralizingLeafy = (ings: { name: string; status: string }[]): boolean => {
    const neutralizerKeywords = ["шпинат", "брокколи", "яблоко", "лён", "льнян", "чиа", "зелень", "салат", "капуст", "сельдерей", "петруш", "укроп", "кинз"];
    return ings.some(ing =>
      ing.status === "green" && neutralizerKeywords.some(kw => ing.name.toLowerCase().includes(kw))
    );
  };

  const GLASS_ML = 250
  const MAX_GAP_HOURS = 2
  const activeStartMin = WATER_ACTIVE_START_MIN      // 08:00
  const activeWindowMin = WATER_ACTIVE_WINDOW_MIN    // 840 мин (08:00–22:00)
  const activeEndMin = activeStartMin + activeWindowMin

  const currentHour = new Date().getHours()
  const currentMinute = new Date().getMinutes()
  const nowMinutes = currentHour * 60 + currentMinute
  const awakeMinutesToday = Math.max(1, Math.min(nowMinutes - activeStartMin, activeWindowMin))
  const remainingMinutes = Math.max(0, activeEndMin - nowMinutes)

  const hoursSinceLastDrink = (() => {
    if (!input.lastWaterTimestamp) return 99
    return (Date.now() - input.lastWaterTimestamp) / (1000 * 60 * 60)
  })()

  const hoursAwake = Math.max(1, awakeMinutesToday / 60)

  // Expected water volume by this time (linear projection across waking hours)
  const expectedWaterByNow = Math.round(waterTarget * (awakeMinutesToday / activeWindowMin))
  const waterDeficit = expectedWaterByNow - water

  // Projection to end of day: if user continues at same pace
  const paceMlPerHour = water / hoursAwake
  const projectedToBed = Math.round(water + paceMlPerHour * (remainingMinutes / 60))
  const projectedDeficit = waterTarget - projectedToBed

  // ==========================================
  // LEVEL 1: CRITICAL DEFICITS (Highest Priority)
  // ==========================================

  // 1. Critical Sleep Deficit
  if (sleep > 0 && sleep < 240) {
    return {
      title: "Дыхательное снижение стресса",
      desc: "Из-за критического дефицита сна ночного восстановления не произошло. Сделай 5-минутную паузу для глубокого дыхания 4-7-8, чтобы заблокировать выброс кортизола и защитить сердце.",
      icon: "🧘",
      btnText: "Перейти к дыханию",
      actionType: "habits",
      reasoning: `Поскольку вы спали всего ${Math.round(sleep / 60)} ч., ваша симпатическая нервная система сейчас находится в перегруженном состоянии. Медленное брюшное дыхание — это кратчайший способ стимулировать блуждающий нерв, снизить системное сосудистое сопротивление и уберечь клетки от оксидативного шока.`
    };
  }

  // 2. Unfriendly / Non-WFPB (Red status) components detected
  if (redIngredients.length > 0) {
    const badNames = redIngredients.slice(0, 2).map(i => i.name.toLowerCase()).join(" и ");
    if (hasNeutralizingLeafy(aggregatedIngredients)) {
      // neutralized — skip, let engine fall through to next priority
    } else {
      return {
        title: "Нейтрализация волокнами",
        desc: `В текущем рационе замечена нагрузка (${badNames}). Сделай следующий приём пищи максимально цельным и богатым клетчаткой (добавь шпинат или ложку льна), чтобы связать и вывести простые гликотоксины.`,
        icon: "🍃",
        btnText: "Выбрать зелёный рецепт",
        actionType: "book-recipes",
        reasoning: `Обнаружены вещества, не соответствующие строгому оздоровительному WFPB-стандарту (${badNames}). Рафинированные сахара или насыщенные жиры повреждают тонкий эндотелий сосудов и провоцируют гликемические качели. Мягкая нейтрализация органическими волокнами шпината, брокколи или пектином яблока замедляет всасывание вредных элементов и защищает ваши почки.`
      };
    }
  }

  // 3. Time-Aware Hydration Deficit
  const isOverdueByVolume = waterDeficit >= GLASS_ML
  const isOverdueByTime = hoursSinceLastDrink > MAX_GAP_HOURS && water < waterTarget

  if (isOverdueByVolume || isOverdueByTime) {
    if (projectedDeficit > 0 && hoursSinceLastDrink > 1.5) {
      const neededPace = Math.max(0, Math.ceil((waterTarget - water) / Math.max(1, remainingMinutes / 60)))
      return {
        title: "Ритм гидратации",
        desc: `Выпито ${water} мл из ${waterTarget} мл. До вечера осталось ${Math.round(remainingMinutes / 60)} ч. При текущем темпе к 23:00 будет ~${projectedToBed} мл, нехватка ${projectedDeficit} мл. Рекомендуемый темп: ~${neededPace} мл/ч. Выпей стакан прямо сейчас.`,
        icon: "💧",
        btnText: "Добавить 250 мл воды",
        actionType: "water",
        reasoning: `К этому часу ожидалось ~${expectedWaterByNow} мл воды, выпито ${water} мл. Отставание ${Math.max(0, waterDeficit)} мл. Если не увеличить темп, к вечеру дефицит составит ${projectedDeficit} мл, что приведёт к сгущению лимфы и замедлению фильтрации почек.`
      };
    } else {
      return {
        title: "Накопление клеточной влаги",
        desc: `Баланс гидратации ниже ожидаемого к этому часу (${water} мл из ${expectedWaterByNow} мл), последний приём воды был ${Math.round(hoursSinceLastDrink)} ч. назад. Выпей стакан чистой воды, чтобы облегчить фильтрацию лимфы.`,
        icon: "🥛",
        btnText: "Добавить 250 мл воды",
        actionType: "water",
        reasoning: `С каждым часом почки фильтруют около 5 литров крови. Сейчас ${water} мл при ожидаемых ${expectedWaterByNow} мл к этому времени — отставание на ${Math.max(0, waterDeficit)} мл. Поддерживая водно-солевое равновесие мелкими порциями воды, вы предохраняете клетки крови от склеивания и регулируете тонус стенок средних сосудов.`
      };
    }
  }

  // 3b. On track but close to bed — remind to finish
  if (remainingMinutes < 120 && water < waterTarget) {
    const need = waterTarget - water
    return {
      title: "Вечерняя влага",
      desc: `День близится к завершению. Осталось выпить ${need} мл до нормы ${waterTarget} мл. Постарайся уложиться до сна, но не пей за час до отхода ко сну, чтобы не нарушить циркадный ритм.`,
      icon: "🌙",
      btnText: "Добавить воду",
      actionType: "water",
      reasoning: `Перед сном важно завершить водный баланс, но избыток жидкости за час до сна создаёт нагрузку на почки в ночную фазу, нарушая выработку антидиуретического гормона и ухудшая качество сна.`
    };
  }

  // 4. Low light feel or Heavy stomach reported in notes or ratingLightness
  if (ratingLightness <= 2 || notesTextLower.includes("тяжесть") || notesTextLower.includes("вздутие") || notesTextLower.includes("дискомфорт")) {
    return {
      title: "Мягкая разгрузка ЖКТ",
      desc: "Наблюдается нагрузка на пищеварительный тракт. Воздержись от твёрдой еды на 4 часа, выпей тёплый ромашковый настой мелкими глотками для снятия мышечных зажимов.",
      icon: "☕",
      btnText: "Записать самочувствие",
      actionType: "diary",
      reasoning: "Повышенное вздутие или чувство тяжести указывает на то, что моторика ЖКТ перегружена или адаптируется к новой дозе клетчатки. Тёплые глотки настоя ромашки или фенхеля блокируют рецепторы блуждающего нерва, нормализуют тонус гладких сфинктеров и деликатно снижают газообразование."
    };
  }

  // 5. Extreme fatigue and energy drain
  if (ratingEnergy <= 2) {
    return {
      title: "Травяное заземление",
      desc: "Физическая энергия упала до минимума. Вместо искусственной стимуляции кофеином выпей тёплый напиток из шиповника или иван-чая и отложи гаджеты на 10 минут.",
      icon: "🍵",
      btnText: "Зафиксировать покой",
      actionType: "diary",
      reasoning: `Падение тонуса до уровня ${ratingEnergy}/5 сигнализирует о временном истощении запасов гликогена и накоплении аденозина. Кофеин лишь усугубит спазм почечных артериол. Тёплый безкофеиновый настой шиповника, богатый витамином C и антиоксидантами, напитает плазму и очистит рецепторы, возвращая бодрость естественно.`
    };
  }

  // 6. Extreme fiber lack
  if (mealCount > 0 && totalFiber < 10) {
    return {
      title: "Клетчаточный импульс",
      desc: `В дневном рационе зафиксировано всего ${Math.round(totalFiber)} г терапевтической клетчатки. Сделай перекус яблоком или добавь две ложки семян чиа/льна, чтобы пробудить метаболическое очищение.`,
      icon: "🍏",
      btnText: "Записать перекус",
      actionType: "what-i-eat",
      reasoning: `Пищевые волокна (${totalFiber} г при норме от 35 г) служат питанием для благородных бактерий. Без волокон они начинают разрушать собственный защитный слой слизистой кишечника. Небольшая горсть семян или свежий фрукт восполнят этот пробел мгновенно.`
    };
  }

  // ==========================================
  // LEVEL 2: CONSTRAINTS & ROAD BLOCKS (Moderate)
  // ==========================================

  // 7a. Evening micro-boost (habits OK but few ingredients logged)
  if (habitsPct >= 60 && currentHour >= 19 && aggregatedIngredients.length < 8) {
    return {
      title: "Вечерний микро-буст",
      desc: `Ключи системы в порядке (${habitsDone}/20), но сырьевой профиль дня собран всего из ${aggregatedIngredients.length} компонентов. Добавь горсть зелени или ложку семян к ужину, чтобы закрыть микронутриентную карту дня.`,
      icon: "🌱",
      btnText: "Выбрать зелёный рецепт",
      actionType: "book-recipes",
      reasoning: `При хорошей активности по ключам системы (${habitsDone}/20) недостаток сырья (${aggregatedIngredients.length} ингредиентов) означает, что часть микронутриентов остаётся незакрытой. Даже небольшая порция листовой зелени или семян чиа насытит вечернюю плазму полифенолами, подготовит сосуды к ночному восстановлению и закрепит пользу дневных привычек.`
    };
  }

  // 7b. Ingredient diversity — ate several dishes but all same ingredient types
  if (mealCount >= 2 && aggregatedIngredients.filter(i => i.status === "green").length < 5) {
    return {
      title: "Сырьевое разнообразие",
      desc: `За день приготовлено ${mealCount} ${getPlural(mealCount, ['блюдо', 'блюда', 'блюд'])}, но использовано только ${aggregatedIngredients.filter(i => i.status === "green").length} видов зелёного сырья. Постарайся включить в следующий приём овощ из новой группы — бобовые, крестоцветные или листовую зелень.`,
      icon: "🥗",
      btnText: "Открыть книгу рецептов",
      actionType: "book-recipes",
      reasoning: `Два и более приготовленных блюда при малом разнообразии ингредиентов (< 5) — признак повторения одного и того же сырья. Разные группы растений кормят разные штаммы кишечной микробиоты. Добавление новой категории (бобовые, капустные, листовая зелень) расширяет спектр короткоцепочечных жирных кислот и укрепляет иммунный барьер слизистой.`
    };
  }

  // 7. Low habits count
  if (habitsPct < 60) {
    const hasMoved = (activityMinutes || 0) > 0;
    if (hasMoved) {
      return {
        title: "Ключи системы: фокус на рацион",
        desc: `Разминка выполнена! Из 20 ключей системы закрыто ${habitsDone}. Добавь в рацион недостающие группы — бобовые, зелень, цельные злаки или отметь действия (без масла, без соли).`,
        icon: "🥗",
        btnText: "Перейти к книге рецептов",
        actionType: "book-recipes",
        reasoning: `Физическая активность (${activityMinutes} мин) уже запустила лимфодренаж и оксигенацию тканей. Теперь организму нужно сырьё для восстановления: недостающие продуктовые группы (${habitsDone}/20) обеспечивают клетки строительным материалом. Приоритет — бобовые, листовая зелень и цельные злаки.`
      };
    }
    return {
      title: "Клеточный импульс",
      desc: `Из 20 ключей системы закрыто ${habitsDone}. Начни с короткой разминки, чтобы запустить лимфоток, а затем добавь в рацион недостающие группы — бобовые, зелень, цельные злаки.`,
      icon: "⚡",
      btnText: "Перейти к ключам системы",
      actionType: "habits",
      reasoning: `Низкий процент закрытых ключей (${habitsDone}/20) сигнализирует о незавершённом сырьевом профиле и пропущенных действиях. Короткая разминка взбодрит лимфу и подготовит тело к приёму пищи, богатой недостающими группами. Каждое выполненное действие закрепляет нейронный контур здоровья.`
    };
  }

  // 9. Chronic pressure adjustments (high sodium protection)
  if (hasChronicPressure && yellowIngredients.some(i => i.name.toLowerCase().includes("соль") || i.name.toLowerCase().includes("масло"))) {
    return {
      title: "Защита сосудистого русла",
      desc: "В дневном рационе замечен скрытый натрий или добавленные масла. Съешь банан или порцию сельдерея, богатых калием, для мгновенного снижения сосудистого тонуса.",
      icon: "🍌",
      btnText: "Выбрать калиевое блюдо",
      actionType: "book-recipes",
      reasoning: "При чувствительности к давлению скрытый натрий задерживает внутрисосудистую жидкость, вызывая растяжение артериальных стенок. Калий и биологические фталиды сельдерея или банана являются антагонистами натрия: они расслабляют мышечный слой артериол и способствуют плавной экскреции излишков соли."
    };
  }

  // 10. Empty Nutrition Log (mealCount is 0, late in the day or starting optimal menu)
  if (mealCount === 0) {
    return {
      title: "Цельный WFPB-старт",
      desc: "В архиве питания пока нет подтверждённых блюд. Посмотри сегодняшнее расписание Книги рецептов и выбери простое согревающее блюдо для поддержки кишечника.",
      icon: "🍲",
      btnText: "Открыть книгу блюд",
      actionType: "book-recipes",
      reasoning: "Сегодня организм ещё не получил дозу биоактивных антиоксидантов и сырых макронутриентов. Своевременные приёмы пищи исключают резкие ночные скачки грелина и застой жёлчи. Загляните в рекомендованный рацион Дня на сегодня."
    };
  }

  // ==========================================
  // LEVEL 3: PERFORMANCE AMPLIFIERS (High state)
  // ==========================================

  // 11. Evening grounding (late hour + low lightness)
  if (currentHour >= 20 && ratingLightness <= 3) {
    return {
      title: "Вечернее заземление",
      desc: "Час поздний, а лёгкость в теле на умеренном уровне. Сделай тёплый травяной настой, приглуши свет и дай блуждающему нерву сигнал к переходу в парасимпатический режим.",
      icon: "🌙",
      btnText: "Записать самочувствие",
      actionType: "diary",
      reasoning: `Время ${currentHour}:00 при лёгкости ${ratingLightness}/5 — нервная система может не успеть переключиться на ночное восстановление. Тёплое питьё без кофеина и снижение световой стимуляции активируют парасимпатический контур, снижая ночной кортизол и улучшая качество регенерации.`
    };
  }

  // 12. Delicate recovery (sleep 4-6 hours but other metrics ok)
  if (sleep >= 240 && sleep < 360 && waterPct >= 80) {
    return {
      title: "Деликатное восстановление",
      desc: `Ночной сон составил ${Math.round(sleep / 60)} ч — ниже оптимума, но водный баланс в порядке. Сделай короткую дыхательную паузу 4-7-8, чтобы компенсировать остаточное напряжение и запустить клеточную регенерацию.`,
      icon: "🧘",
      btnText: "Сделать паузу",
      actionType: "habits",
      reasoning: `Сон ${Math.round(sleep / 60)} часов при ${Math.round(waterPct)}% гидратации — организм не обезвожен, но ночного ремонта было недостаточно. Дыхательная техника 4-7-8 стимулирует блуждающий нерв, снижает пульс и помогает клеткам переключиться в анаболический режим, частично компенсируя нехватку глубоких фаз сна.`
    };
  }

  // 13. Everything is going great (integralScore >= 75%)
  if (integralScore >= 75) {
    return {
      title: "Антиоксидантный купол",
      desc: `Восхитительный баланс дня (${integralScore}%)! Твои клетки на пике тонуса. Чтобы закрепить успех и защитить митохондрии, добавь щепоть микрозелени или горсть сырых грецких орехов к ужину.`,
      icon: "🧠",
      btnText: "Перейти в дневник",
      actionType: "diary",
      reasoning: "При таком высоком уровне баланса системы детоксикации работают безупречно. Омега-3 кислоты грецких орехов и полифенолы микрозелени выступят коферментами и защитят клеточные мембраны от естественного возрастного износа."
    };
  }

  // Fallback
  return {
    title: "Фиксация биологического баланса",
    desc: "Хороший, стабильный темп дня. Размеренно наполняй шкалы, делай тёплые глотки воды и прислушивайся к внутренним сигналам лёгкости в теле.",
    icon: "🧘",
    btnText: "Записать замеры",
    actionType: "diary",
    reasoning: "Все системы находятся в физиологическом равновесии. Продолжайте следовать природному маршруту оздоровления."
  };
}
