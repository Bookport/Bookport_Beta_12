export interface NotificationTimeRange {
  morning: string; // e.g. "07:30 - 10:00"
  day: string;     // e.g. "12:00 - 16:00"
  evening: string; // e.g. "18:30 - 21:30"
  single?: string; // e.g. "09:00 - 12:00"
  mode: "single" | "three";
}

export interface NotificationPreference {
  enabled: boolean;
  explanation: string;
  sourceOfData: string;
  annaPhrase: string;
  previewTemplate: {
    title: string;
    body: string;
    badge: string;
  };
  timeWindows: NotificationTimeRange;
}

export interface UserPreferences {
  // 1. Notifications
  notifications: {
    water: NotificationPreference;
    sleep: NotificationPreference;
    measurements: NotificationPreference;
    habits: NotificationPreference;
    daySummary: NotificationPreference;
    annaTip: NotificationPreference;
  };

  // 2. Nutrition and Goals additional settings
  nutritionSettings: {
    primaryGoal: string;
    gastroIssues: string[]; // Diseases / GI issues (sensitive gut, bloating, gastritis)
    sensitivities: string[]; // Intolerances / sensitivities
    diets: string[]; // Food limitations
    lifestyleHabits: string[]; // habits (late sleep, chaos, caffeine, sugar craving, overeating, fasting)
  };

  // 3. Recipes and Book
  recipePreferences: {
    bookPriority: boolean;
    favoritesOnly: boolean;
    quickOption: boolean; // Fast options (e.g. < 20 min)
    simpleOption: boolean; // Simple options (e.g. < 5 ingredients)
    favoriteTypes: string[]; // salads, soups, second, desserts
  };

  // 4. Verification flag
  onboardingFinished: boolean;
}

// Default initial preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  notifications: {
    water: {
      enabled: true,
      explanation: "Напоминает поддерживать оптимальный водно-солевой баланс и вовремя наполнять клетки фильтрованной тёплой влагой.",
      sourceOfData: "Исходя из занесённого количества мл воды на главном экране по отношению к целевым 2500 мл.",
      annaPhrase: "Сделай глоток за здоровье клеток! Наше тело любит тёплую чистую воду. Напоить себя вовремя — бесценный вклад в почки.",
      previewTemplate: {
        title: "Клеточный глоток 💧",
        body: "Организм запрашивает тёплую чистую влагу. Время выпить стаканчик для тонуса сосудов!",
        badge: "Водный баланс"
      },
      timeWindows: {
        morning: "08:00 - 10:30",
        day: "12:00 - 15:30",
        evening: "18:00 - 20:30",
        mode: "three"
      }
    },
    sleep: {
      enabled: true,
      explanation: "Помогает выстроить стабильный биоритм засыпания, необходимый застой лимфы и регенерацию клеток мозга.",
      sourceOfData: "На основе внесенных часов сна и хрономических отметок за вчерашний день.",
      annaPhrase: "Забочусь о твоём сне! Избыток синего света разрушает мелатонин. Пора выключить экран и сделать глубокий сонный дзен-вдох.",
      previewTemplate: {
        title: "Готовимся ко сну 🌙",
        body: "Пора убрать кофеин и успокоить почечные канальцы. Мягкий отход от экранов подарит легкое пробуждение.",
        badge: "Сон и биоритм"
      },
      timeWindows: {
        morning: "07:00 - 08:30",
        day: "14:00 - 16:00",
        evening: "21:30 - 23:00",
        mode: "three"
      }
    },
    measurements: {
      enabled: true,
      explanation: "Стимулирует аккуратно замерять артериальное давление и показатели массы, чтобы отслеживать снижение системных отёков.",
      sourceOfData: "Сравнивает историю последних дневниковых замеров АД и веса за прошедшие 3 дня.",
      annaPhrase: "Давай снимем мерки здоровья! Тонометр и весы — наши верные друзья в контроле упругости сосудистых русел.",
      previewTemplate: {
        title: "Замеры упругости 📈",
        body: "Настало идеальное время внести давление и пульс в журнал. Понаблюдаем за прекрасным коридором лёгкости!",
        badge: "Тонометрия"
      },
      timeWindows: {
        morning: "08:30 - 10:00",
        day: "13:00 - 15:00",
        evening: "19:00 - 21:00",
        mode: "three"
      }
    },
    habits: {
      enabled: true,
      explanation: "Мотивирует вовремя претворять в жизнь запланированные микро-привычки Клеточного Импульса и Полезной Двадцатки.",
      sourceOfData: "Анализирует процент сегодняшнего выполнения привычек на шкале активности.",
      annaPhrase: "Маленькие действия копят великий результат! Отметим привычки, получим наш порционный дофамин.",
      previewTemplate: {
        title: "Клеточный импульс ✨",
        body: "Твоё тело просит движения! 30 минут активности снимут венозный застой. Готовы сделать пару вдохов?",
        badge: "Привычки"
      },
      timeWindows: {
        morning: "09:00 - 11:00",
        day: "14:30 - 17:00",
        evening: "18:30 - 21:00",
        mode: "three"
      }
    },
    daySummary: {
      enabled: true,
      explanation: "Мягко сопровождает в завершении дня, подводит молекулярные итоги здоровья и воодушевляет на следующий крепкий шаг.",
      sourceOfData: "Формирует комплексную аналитическую картину на основании занесённых блюд, воды и веса за день.",
      annaPhrase: "День был по-настоящему чистым и здоровым! Я уже разложила твои нутриенты по полочкам и составила план лёгкости.",
      previewTemplate: {
        title: "Итоги дня с Анной 💚",
        body: "Сводный чарт готов! Клетки очистились и ликуют. Давай посмотрим наш следующий выдающийся WFPB-шаг.",
        badge: "Анализ дня"
      },
      timeWindows: {
        morning: "09:00 - 11:30",
        day: "13:00 - 15:00",
        evening: "20:30 - 22:30",
        mode: "three"
      }
    },
    annaTip: {
      enabled: true,
      explanation: "Предоставляет кастомизированные краткие терапевтические рецепты вкусов на основе текущего состояния ЖКТ.",
      sourceOfData: "Анализирует уровень лёгкости, тягу к сахару, диспепсию, гастрит и другие отмеченные параметры.",
      annaPhrase: "Свежая порция природного знания готова! Давай расскажу, как обогатить кашу пектином без единого грамма сахара.",
      previewTemplate: {
        title: "Микронутриентный секрет 💚",
        body: "Один теплый совет от Анны, основанный на целях твоего ЖКТ. Меньше соли — чище артерии!",
        badge: "ИИ Совет дня"
      },
      timeWindows: {
        morning: "07:30 - 09:30",
        day: "12:30 - 14:30",
        evening: "18:00 - 20:00",
        mode: "three"
      }
    }
  },
  nutritionSettings: {
    primaryGoal: "improve_digestion",
    gastroIssues: [],
    sensitivities: [],
    diets: [],
    lifestyleHabits: []
  },
  recipePreferences: {
    bookPriority: true,
    favoritesOnly: false,
    quickOption: false,
    simpleOption: false,
    favoriteTypes: []
  },
  onboardingFinished: true
};

let _prefs: UserPreferences | null = null;

export const UserPreferencesStore = {
  load(): UserPreferences {
    if (_prefs) return _prefs;
    return DEFAULT_PREFERENCES;
  },

  save(prefs: UserPreferences): void {
    _prefs = prefs;
  },

  reset(): UserPreferences {
    _prefs = null;
    return DEFAULT_PREFERENCES;
  },

  /**
   * Generates a dynamic personalized "Anna's Tip of the Day"
   * based on the custom user conditions
   */
  generateAnnaTip(prefs: UserPreferences, currentDay: number): string {
    const issues = prefs.nutritionSettings.gastroIssues || [];
    const habitsList = prefs.nutritionSettings.lifestyleHabits || [];
    const goal = prefs.nutritionSettings.primaryGoal;

    if (issues.includes("hypertension") || habitsList.includes("много кофеина")) {
      return `Заметила твою цель беречь сосуды. Попробуй полностью заменить утренний кофе на целебную чашечку безкофеинового ройбуша с палочкой цейлонской корицы. Это укрепит эндотелий капилляров и спасёт сосуды от спазма! 🫖`;
    }

    if (issues.includes("gastritis") || issues.includes("reflux")) {
      return `При повышенной чувствительности желудка избегай сырых холодных овощей натощак. Идеальный выбор для утреннего ЖКТ сегодня — тёплая слизистая каша из овса долгой варки с запечённым пюре сладкого яблока. Комфорт гарантирован! 🥣`;
    }

    if (habitsList.includes("тяга к сладкому")) {
      return `Твои рецепторы заслуживают чистоты! Если захочется сладкого в течение дня, съешь горсть сушёной шелковицы или спелый банан. Пищевые волокна замедлят всасывание сахаров, исключая скачки инсулина и усталость. 🍌`;
    }

    if (habitsList.includes("поздний сон") || habitsList.includes("хаотичный режим")) {
      return `После продуктивного дня телу нужен глубокий мелатониновый сон. Выключи экраны за 1 час до сна и сделай 3 тёплых глотка несладкого настоя мелиссы. Это успокоит блуждающий нерв и облегчит ночную чистку лимфы. 😴`;
    }

    if (habitsList.includes("недостаток воды")) {
      return `Помни про водно-солевой баланс! Нам очень важно пить тёплую чистую воду именно в промежутках между едой, за 20 минут до или через 1.5 часа после. Это сохранит силу желудочного сока для безупречного переваривания. 💧`;
    }

    // Default tip based on current progess
    return `На Дне ${currentDay} растительного маршрута твои микробиомы кишечника активно преобразуются. Порадуй их сегодня ложечкой свежемолотых семян льна, добавленных в зелёный смузи или боул — твои сосуды скажут спасибо! 🌿`;
  }
};
