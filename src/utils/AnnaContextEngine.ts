import { UserPreferences } from "../services/UserPreferencesStore";

export interface UserProfile {
  name: string;
  gender: "female" | "male";
  age: number;
  height: number;
  weight: number;
  systolic: number; // blood pressure (upper)
  diastolic: number; // blood pressure (lower)
}

export interface HealthConditions {
  selectedChronic: string[]; // e.g. hypertension, gastritis, reflux, diabetes, ibs, constipation...
  selectedGoals: string[]; // e.g. lose_weight, improve_digestion, regular_stool, drink_water...
  lifestyleHabits: string[]; // e.g. "поздний сон", "недостаток воды", "много кофеина"...
}

export interface DailyProgress {
  waterDrankMl: number;
  waterTargetMl: number;
  caloriesKcal: number;
  stepsCount: number;
  stepsTarget: number;
  sleepHours: number;
  gastroIndex: number; // wellbeing rating (0 to 10 scale or similar)
  currentDayOfCourse: number; // 1 to 28
}

export interface AnnaContextPayload {
  userProfile: UserProfile;
  healthConditions: HealthConditions;
  progress: DailyProgress;
}

/**
 * Intelligent analyzer of user health constraints, active goals, and real-time progress.
 * Integrates senior WFPB guidelines to guide Anna's context outputs without clinical tech-larping.
 */
export function generateAnnaContext(data: AnnaContextPayload): {
  systemPrompt: string;
  focusRecommendations: string[];
  restrictedTriggers: string[];
  encouragingMessage: string;
} {
  const { userProfile, healthConditions, progress } = data;
  const recommendations: string[] = [];
  const restrictions: string[] = [];
  
  const bmi = userProfile.height > 0 ? (userProfile.weight / ((userProfile.height / 100) ** 2)) : 22;
  let promptAnalysis = `Пользователь: ${userProfile.name || "Исследователь"} (${userProfile.gender === "female" ? "Женщина" : "Мужчина"}, ${userProfile.age} лет, ИМТ: ${bmi.toFixed(1)}). `;

  const goals = healthConditions.selectedGoals || [];
  const chronic = healthConditions.selectedChronic || [];
  const habits = healthConditions.lifestyleHabits || [];

  // Identify core conditions and flags
  const wantsToLoseWeight = goals.includes("lose_weight");
  const hasGastricIssues = chronic.includes("gastritis") || chronic.includes("reflux") || chronic.includes("ibs");
  const hasHypertension = chronic.includes("hypertension") || userProfile.systolic > 135;
  const hasDiabetes = chronic.includes("diabetes") || goals.includes("stabilize_sugar");
  const hasConstipation = chronic.includes("constipation") || goals.includes("regular_stool");

  // Cross-Analysis logic linking weight loss + gastric sensitivity + hypertension
  if (wantsToLoseWeight) {
    if (hasGastricIssues && hasHypertension) {
      promptAnalysis += "Пользователь хочет снизить вес, но имеет уязвимый ЖКТ и гипертонию. Исключить жёсткие диеты, голодание и сырые грубые овощи в вечернее время. Рекомендовать термически обработанную WFPB-еду (пюре из тыквы, запеченные цукини, разваренный бурый рис), контролировать скрытый натрий и соевый соус.";
      recommendations.push("Заменяйте сырые грубые овощи на ужин запеченными WFPB-вариантами");
      recommendations.push("Контролируйте скрытый натрий в консервированных бобах (промывайте их перед употреблением)");
      restrictions.push("Сырая жесткая клетчатка перед сном", "Соленые соусы и добавленная очищенная соль");
    } else if (hasGastricIssues) {
      promptAnalysis += "Снижение веса с фокусом на деликатное пищеварение ЖКТ. Дробные супы-пюре, тушеные кабачки с киноа, исключить раздражающие специи и неразмоченные твердые семечки.";
      recommendations.push("Делайте акцент на крем-супах и тушеных боулах вместо хрустящих зеленых салатов");
      restrictions.push("Острый имбирь и уксус в заправках", "Сырые орехи горстями");
    } else if (hasHypertension) {
      promptAnalysis += "Снижение веса при склонности к повышенному давлению. Калий-магниевый рацион (листовой шпинат, запеченный в кожуре картофель, бананы, курага), полный отказ от соленой консервации.";
      recommendations.push("Добавьте в обеденный рацион 100 г шпината или свежей кинзы как источник оксида азота");
      restrictions.push("Соленый соус тамари", "Консервированные томаты с солью");
    } else {
      promptAnalysis += "Классический протокол снижения веса на цельном растительном питании. Плотное насыщение клетчаткой и сложными углеводами, уменьшение доли сухих жиров.";
      recommendations.push("Заменяйте сухие покупные снеки на ломтики яблок с тонкими слайсами миндаля");
    }
  }

  // Independent gastro-protective limits
  if (hasGastricIssues) {
    if (chronic.includes("reflux")) {
      promptAnalysis += " Выраженный желудочный рефлюкс. СТРОГО за 3 часа до сна ни крошки. Исключить мяту в чаях, какао-продукты, крепкий чай.";
      recommendations.push("Продолжайте ужинать строго за 3 часа до сна; держите осанку прямой после еды");
      restrictions.push("Мятные чаи", "Темный растительный шоколад вечером");
    }
    if (chronic.includes("ibs")) {
      promptAnalysis += " Синдром раздраженного кишечника (СРК). Рекомендовать умеренное количество продуктов с высоким содержанием FODMAP, приоритет запеченным корнеплодам.";
      recommendations.push("Используйте щадящую порцию бобовых (не более 3 столовых ложек за раз) в теплом виде");
    }
  }

  // Diabetes and glucose stability
  if (hasDiabetes) {
    promptAnalysis += " Пользователь контролирует кривую сахара в крови. Сочетать любые источники простых сахаров (фрукты, ягоды) с пищевыми волокнами, белком или семенами чиа/льна, чтобы сгладить пик инсулина.";
    recommendations.push("Любые ягоды или фрукты употребляйте только вместе с семенами подсолнечника или тыквы");
    restrictions.push("Белый шлифованный рис", "Растительные сиропы (топинамбура, агавы) натощак");
  }

  // Constipation and GI motility
  if (hasConstipation) {
    promptAnalysis += " Коррекция моторики толстого кишечника. Регулярная нормализация стула достигается за счет запаренных семян льна, достаточного объема теплой воды утром.";
    recommendations.push("Выпивайте стакан теплой чистой воды за 15-20 минут до завтрака");
    recommendations.push("Добавьте 1.5 столовых ложки молотых семян льна к утренней овсянке");
  }

  // Habit analyzer clues
  if (habits.includes("поздний сон")) {
    recommendations.push("Прекратите скроллинг смартфона за 45 минут до укладывания для сохранения мелатонинового пика");
  }
  if (habits.includes("недостаток воды")) {
    recommendations.push("Поставьте кувшин с чистой водой на рабочий стол в поле зрения");
  }

  // 28-day course progression adjustments
  const currentDay = progress.currentDayOfCourse || 1;
  promptAnalysis += ` Текущий этап 28-дневной программы: день ${currentDay} из 28. `;
  
  if (currentDay <= 7) {
    promptAnalysis += "Этап А: Первичная детоксикация и адаптация дофаминовых вкусовых рецепторов. Поддерживать вдохновение, не нагружать сложной биохимией.";
  } else if (currentDay <= 21) {
    promptAnalysis += "Этап Б: Активная полиферация полезной кишечной микробиоты. Предупреждать о возможных легких дискомфортах при быстрой ферментации.";
  } else {
    promptAnalysis += "Этап В: Укрепление сосудистого тонуса, регенерация слизистых и формирование устойчивых нейронных связей. Рассматривать рацион как полноценный образ жизни.";
  }

  // Crafting dynamic motivational message
  let comfortingMsg = "Вы сохраняете отличную WFPB дисциплину! Ваш организм с благодарностью откликается на чистое растительное топливо.";
  if (progress.gastroIndex > 7) {
    comfortingMsg = `Великолепно! Ваш индекс здоровья ЖКТ равен ${progress.gastroIndex} из 10. Кишечник полностью адаптировался к обилию качественной растительной клетчатки.`;
  } else if (progress.gastroIndex > 0 && progress.gastroIndex <= 4) {
    comfortingMsg = `Небольшая перестройка пищеварения (индекс ${progress.gastroIndex}) — естественный этап адаптации микробиома к WFPB-волокнам. Сделайте сегодня упор на бережные супы-пюре.`;
  }

  return {
    systemPrompt: promptAnalysis,
    focusRecommendations: recommendations.length > 0 ? recommendations : ["Включайте по возможности новые оттенки разнообразия в ваши зеленые боулы"],
    restrictedTriggers: restrictions.length > 0 ? restrictions : ["Рафинированный крахмал", "Растительные консервы с консервантами"],
    encouragingMessage: comfortingMsg
  };
}
