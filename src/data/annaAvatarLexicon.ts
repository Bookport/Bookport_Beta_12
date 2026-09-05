import type { AnnaAvatarLexiconRule } from "../types/annaAvatar";

/**
 * Semantic rules for Anna's preliminary reaction.
 *
 * These rules are used only by the planner. They do not know anything about
 * React, components, WebP paths, server endpoints, or the image manifest.
 *
 * A longer exact phrase has precedence over generic words through `priority`.
 * `excludePhrases` prevents obvious false positives in broad word matches.
 */
export const ANNA_AVATAR_LEXICON: readonly AnnaAvatarLexiconRule[] = [
  // ---------------------------------------------------------------------------
  // USER INPUT: emotional state, questions, achievements and resistance.
  // The user is never mocked or aggressively judged by automatic text analysis.
  // ---------------------------------------------------------------------------
  {
    id: "user-relapse-guilt",
    scope: "user_input",
    priority: 100,
    intent: "affirmation",
    intensity: 2,
    phrases: [
      "я опять сорвался",
      "я опять сорвалась",
      "сорвался и переел",
      "сорвалась и переела",
      "съел всё подряд",
      "съела всё подряд",
      "не смог остановиться",
      "не смогла остановиться",
      "мне стыдно за еду",
      "мне стыдно что я съел",
      "мне стыдно что я съела",
      "я всё испортил",
      "я всё испортила",
    ],
  },
  {
    id: "user-anxiety-overwhelm",
    scope: "user_input",
    priority: 96,
    intent: "understanding_nuances",
    intensity: 2,
    phrases: [
      "мне тревожно",
      "я тревожусь",
      "мне страшно",
      "я боюсь что не справлюсь",
      "я не справляюсь",
      "у меня опускаются руки",
      "мне очень тяжело",
      "я запутался",
      "я запуталась",
    ],
  },
  {
    id: "user-fatigue-low-energy",
    scope: "user_input",
    priority: 92,
    intent: "joy_and_support",
    intensity: 2,
    phrases: [
      "я очень устал",
      "я очень устала",
      "нет сил",
      "совсем нет энергии",
      "не хватает сил",
      "я вымотался",
      "я вымоталась",
      "ничего не хочется",
    ],
  },
  {
    id: "user-digestion-concern",
    scope: "user_input",
    priority: 90,
    intent: "caution",
    intensity: 2,
    phrases: [
      "болит живот",
      "болит желудок",
      "сильное вздутие",
      "вздулся живот",
      "вздутие после еды",
      "тошнит после еды",
      "мне плохо после еды",
      "тяжесть после еды",
      "плохое самочувствие",
    ],
  },
  {
    id: "user-success-streak",
    scope: "user_input",
    priority: 88,
    intent: "joy_user_success",
    intensity: 3,
    phrases: [
      "я выдержал",
      "я выдержала",
      "у меня получилось",
      "я справился",
      "я справилась",
      "я молодец",
      "я смог",
      "я смогла",
      "я не сорвался",
      "я не сорвалась",
      "выполнил цель",
      "выполнила цель",
    ],
  },
  {
    id: "user-gratitude",
    scope: "user_input",
    priority: 84,
    intent: "joy_and_support",
    intensity: 2,
    phrases: [
      "спасибо анна",
      "большое спасибо",
      "ты мне помогла",
      "это очень помогло",
      "мне стало понятнее",
      "мне легче",
    ],
  },
  {
    id: "user-curiosity-question",
    scope: "user_input",
    priority: 70,
    intent: "curiosity",
    intensity: 2,
    phrases: [
      "мне интересно",
      "хочу понять",
      "объясни пожалуйста",
      "почему так",
      "как это работает",
      "расскажи подробнее",
    ],
  },
  {
    id: "user-confusion",
    scope: "user_input",
    priority: 68,
    intent: "clear_explanation",
    intensity: 2,
    phrases: [
      "я не понимаю",
      "непонятно",
      "объясни проще",
      "слишком сложно",
      "можно простыми словами",
      "в чём разница",
    ],
  },
  {
    id: "user-resistance",
    scope: "user_input",
    priority: 62,
    intent: "questioning",
    intensity: 2,
    phrases: [
      "не хочу отказываться",
      "я не готов отказаться",
      "я не готова отказаться",
      "это слишком сложно",
      "у меня не получится",
      "я не верю",
      "зачем вообще",
    ],
  },

  // ---------------------------------------------------------------------------
  // ASSISTANT REPLY: fallback for endpoints that still return plain text only.
  // Server-side explicit intent always has a higher priority than these rules.
  // ---------------------------------------------------------------------------
  {
    id: "reply-warm-support",
    scope: "assistant_reply",
    priority: 90,
    intent: "affirmation",
    intensity: 2,
    phrases: [
      "ты ничего не испортил",
      "ты ничего не испортила",
      "один эпизод не отменяет",
      "не нужно себя ругать",
      "давай без самокритики",
      "я рядом",
      "это нормально",
    ],
  },
  {
    id: "reply-praise-progress",
    scope: "assistant_reply",
    priority: 86,
    intent: "joy_user_success",
    intensity: 3,
    phrases: [
      "ты отлично справился",
      "ты отлично справилась",
      "это заметный прогресс",
      "ты молодец",
      "отличный результат",
      "хорошая работа",
      "ты уже многое сделал",
      "ты уже многое сделала",
    ],
  },
  {
    id: "reply-clear-explanation",
    scope: "assistant_reply",
    priority: 78,
    intent: "clear_explanation",
    intensity: 3,
    phrases: [
      "давай разберёмся",
      "смотри как это работает",
      "важно понимать",
      "проще говоря",
      "вот в чём смысл",
      "разложу по шагам",
    ],
  },
  {
    id: "reply-gentle-reminder",
    scope: "assistant_reply",
    priority: 75,
    intent: "useful_reminder",
    intensity: 2,
    phrases: [
      "мягко напомню",
      "обрати внимание",
      "не забывай",
      "стоит попробовать",
      "на сегодня достаточно",
      "небольшой шаг",
    ],
  },
  {
    id: "reply-caution",
    scope: "assistant_reply",
    priority: 82,
    intent: "caution",
    intensity: 2,
    phrases: [
      "будь внимательнее",
      "лучше не торопиться",
      "стоит обсудить с врачом",
      "важно не игнорировать",
      "обратись к врачу",
      "нужна осторожность",
    ],
  },
  {
    id: "reply-strict-prohibition",
    scope: "assistant_reply",
    priority: 88,
    intent: "warning_and_prohibition",
    intensity: 3,
    phrases: [
      "лучше исключить",
      "не стоит использовать",
      "это не подходит",
      "не рекомендую",
      "важно исключить",
    ],
  },

  // ---------------------------------------------------------------------------
  // DISH ANALYSIS: used only for an Anna dish-comment context.
  // Never apply these rules to an ordinary question from the user.
  // ---------------------------------------------------------------------------
  {
    id: "dish-clean-result",
    scope: "dish_analysis",
    priority: 82,
    intent: "cheerful_approval",
    intensity: 3,
    phrases: [
      "полностью соответствует wfpb",
      "чистый растительный состав",
      "отличный wfpb вариант",
      "хороший растительный выбор",
      "без добавленного масла",
    ],
  },
  {
    id: "dish-one-violation",
    scope: "dish_analysis",
    priority: 86,
    intent: "important_reminder",
    intensity: 2,
    phrases: [
      "есть один момент",
      "одно нарушение",
      "можно улучшить",
      "лучше заменить",
      "стоит убрать",
    ],
  },
  {
    id: "dish-multiple-violations",
    scope: "dish_analysis",
    priority: 94,
    intent: "irritation_and_anger",
    intensity: 3,
    phrases: [
      "несколько нарушений wfpb",
      "много нарушений",
      "мясо молочные продукты и масло",
      "масло соль и сахар",
      "этот состав не соответствует",
    ],
  },
  {
    id: "dish-ironic-comment",
    scope: "dish_analysis",
    priority: 89,
    intent: "mockery",
    intensity: 2,
    phrases: [
      "ну конечно",
      "кулинарная ловушка",
      "маскируется под полезное",
      "зелёный нимб",
    ],
  },

  // ---------------------------------------------------------------------------
  // WATER: textual fallback. Numeric water progress will later have priority.
  // ---------------------------------------------------------------------------
  {
    id: "water-near-goal",
    scope: "water",
    priority: 78,
    intent: "cheerful_approval",
    intensity: 3,
    phrases: [
      "ты почти у цели",
      "остался один стакан",
      "водный баланс почти",
      "план по воде почти выполнен",
    ],
  },
  {
    id: "water-reminder",
    scope: "water",
    priority: 72,
    intent: "useful_reminder",
    intensity: 2,
    phrases: [
      "пора сделать несколько глотков",
      "можно выпить воды",
      "небольшой стакан воды",
      "воды пока мало",
    ],
  },

  // ---------------------------------------------------------------------------
  // MOVEMENT: textual fallback. Minutes and sessions will later have priority.
  // ---------------------------------------------------------------------------
  {
    id: "movement-goal-complete",
    scope: "movement",
    priority: 80,
    intent: "success",
    intensity: 3,
    phrases: [
      "цель по движению выполнена",
      "дневная цель достигнута",
      "ты выполнил норму движения",
      "ты выполнила норму движения",
    ],
  },
  {
    id: "movement-gentle-start",
    scope: "movement",
    priority: 70,
    intent: "joy_and_support",
    intensity: 2,
    phrases: [
      "начни с нескольких минут",
      "подойдёт короткая прогулка",
      "мягкое движение тоже считается",
      "даже пять минут важны",
    ],
  },

  // ---------------------------------------------------------------------------
  // MEASUREMENTS / ORGANISM: deliberately calm and non-diagnostic.
  // ---------------------------------------------------------------------------
  {
    id: "measurements-steady-progress",
    scope: "measurements",
    priority: 78,
    intent: "satisfaction",
    intensity: 2,
    phrases: [
      "динамика выглядит стабильной",
      "есть спокойный прогресс",
      "показатели меняются постепенно",
      "регулярные замеры помогают",
    ],
  },
  {
    id: "measurements-medical-caution",
    scope: "measurements",
    priority: 88,
    intent: "important_clarification",
    intensity: 2,
    phrases: [
      "обсуди это с врачом",
      "лучше показать врачу",
      "нужна консультация специалиста",
      "не ставь диагноз самостоятельно",
    ],
  },
  {
    id: "organism-recovery",
    scope: "organism",
    priority: 74,
    intent: "understanding_nuances",
    intensity: 2,
    phrases: [
      "организму нужно время",
      "восстановление происходит постепенно",
      "прислушайся к самочувствию",
      "важен бережный темп",
    ],
  },

  // ---------------------------------------------------------------------------
  // STATE NOW: defaults for explanatory comments within individual tabs.
  // ---------------------------------------------------------------------------
  {
    id: "state-now-balance",
    scope: "state_now",
    priority: 60,
    intent: "explanation",
    intensity: 3,
    phrases: ["баланс дня", "общая картина", "ключевые показатели"],
  },
  {
    id: "state-now-nutrients",
    scope: "state_now",
    priority: 62,
    intent: "understanding_nuances",
    intensity: 3,
    phrases: ["микронутриенты", "витамины и минералы", "питательная плотность"],
  },
  {
    id: "state-now-dynamics",
    scope: "state_now",
    priority: 62,
    intent: "thoughtful",
    intensity: 3,
    phrases: ["динамика", "изменения за период", "сравнение с предыдущим"],
  },
];

export const ANNA_AVATAR_LEXICON_BY_SCOPE = {
  system: ANNA_AVATAR_LEXICON.filter((rule) => rule.scope === "system"),
  user_input: ANNA_AVATAR_LEXICON.filter((rule) => rule.scope === "user_input"),
  assistant_reply: ANNA_AVATAR_LEXICON.filter((rule) => rule.scope === "assistant_reply"),
  chat: ANNA_AVATAR_LEXICON.filter((rule) => rule.scope === "chat"),
  dish_analysis: ANNA_AVATAR_LEXICON.filter((rule) => rule.scope === "dish_analysis"),
  mixer: ANNA_AVATAR_LEXICON.filter((rule) => rule.scope === "mixer"),
  water: ANNA_AVATAR_LEXICON.filter((rule) => rule.scope === "water"),
  movement: ANNA_AVATAR_LEXICON.filter((rule) => rule.scope === "movement"),
  measurements: ANNA_AVATAR_LEXICON.filter((rule) => rule.scope === "measurements"),
  organism: ANNA_AVATAR_LEXICON.filter((rule) => rule.scope === "organism"),
  state_now: ANNA_AVATAR_LEXICON.filter((rule) => rule.scope === "state_now"),
} as const;
