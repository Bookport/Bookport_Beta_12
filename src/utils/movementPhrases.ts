import { DailySummary } from "./crossModuleSummary";

export interface MovementContext {
  userName?: string;
  userGender?: 'male' | 'female';
  summary: DailySummary;
  activeMinutes: number;
  dailyGoal: number; // Обычно 30
  pulse: number | null;
  weightDelta: number | null; // Отрицательное = отвес
}

export const t = (gender: 'male' | 'female', m: string, f: string) => gender === 'male' ? m : f;

export const MOVEMENT_PHRASES = {
  // === ОСЬ 1: КРИТИЧЕСКИЙ НЕДОСТАТОК ДВИЖЕНИЯ (< 50%) ===

  // 1.1 Просто мало движения (без триггеров)
  movementCritical_Base: [
    (ctx: MovementContext) => `${ctx.userName}, всего ${ctx.activeMinutes} мин активности. Твои мышцы просят работы! ${t(ctx.userGender, 'Встань', 'Встань')} и сделай легкую разминку прямо сейчас.`,
    (ctx: MovementContext) => `Вижу ${ctx.activeMinutes} мин из ${ctx.dailyGoal}. Это очень мало для поддержания метаболизма. Давай пройдемся хотя бы по комнате?`,
    (ctx: MovementContext) => `Твой трекер показывает ${ctx.activeMinutes} мин. Гиподинамия замедляет пищеварение, а на растительном рационе кишечнику нужно помогать движением!`,
    (ctx: MovementContext) => `${ctx.userName}, движение на нуле. Найди 10 минут на простую растяжку, тело скажет тебе спасибо.`,
    (ctx: MovementContext) => `Пока только ${ctx.activeMinutes} мин активности. Не давай крови застаиваться, нам нужна циркуляция кислорода!`,
    (ctx: MovementContext) => `Смотрю на твои ${ctx.activeMinutes} мин и понимаю: пора вставать. Даже легкая прогулка лучше, чем идеальное сидение.`,
    (ctx: MovementContext) => `Цель ${ctx.dailyGoal} мин, а у тебя ${ctx.activeMinutes} мин. Энергия рождается в действии, ${t(ctx.userGender, 'начни', 'начни')} двигаться!`,
    (ctx: MovementContext) => `Без движения (${ctx.activeMinutes} мин) суставы теряют смазку. Сделай пару наклонов и приседаний, разогрей тело.`,
    (ctx: MovementContext) => `Всего ${ctx.activeMinutes} мин активности за день. Нам нужно больше динамики, чтобы сердце работало эффективно!`,
    (ctx: MovementContext) => `Ты сегодня ${t(ctx.userGender, 'засиделся', 'засиделась')}. ${ctx.activeMinutes} мин — это маловато. Выходи на улицу подышать свежим воздухом.`
  ],

  // 1.2 Мало движения + Высокий пульс (> 75)
  movementCritical_HighPulse: [
    (ctx: MovementContext) => `Движения мало (${ctx.activeMinutes} мин), а пульс высокий (${ctx.pulse}). Сердцу тяжело! Легкое кардио поможет натренировать сердечную мышцу.`,
    (ctx: MovementContext) => `${ctx.userName}, высокий пульс (${ctx.pulse}) в покое часто бывает из-за нетренированности. У тебя всего ${ctx.activeMinutes} мин активности. Давай гулять!`,
    (ctx: MovementContext) => `При активности ${ctx.activeMinutes} мин твой пульс подскочил до ${ctx.pulse}. Сердце компенсирует гиподинамию. Нужна регулярная ходьба!`,
    (ctx: MovementContext) => `Чтобы снизить пульс с ${ctx.pulse} до нормы, нужно больше кардионагрузок. А у тебя пока ${ctx.activeMinutes} мин. ${t(ctx.userGender, 'Начинай', 'Начинай')} тренироваться.`,
    (ctx: MovementContext) => `Пульс ${ctx.pulse} на фоне засухи в движении (${ctx.activeMinutes} мин) — тревожный звоночек. Сердцу нужен кислород от физической работы.`,
    (ctx: MovementContext) => `Слабая сердечная мышца бьется чаще (${ctx.pulse}). Чтобы ее укрепить, нужно закрывать цель в ${ctx.dailyGoal} мин, а у тебя ${ctx.activeMinutes} мин.`,
    (ctx: MovementContext) => `${ctx.userName}, не пугай меня пульсом ${ctx.pulse}. Выходи на прогулку! ${ctx.activeMinutes} мин активности недостаточно для здоровья сосудов.`,
    (ctx: MovementContext) => `Застой крови из-за сидения (${ctx.activeMinutes} мин) заставляет сердце частить (пульс ${ctx.pulse}). Вставай, сделай суставную гимнастику!`,
    (ctx: MovementContext) => `Высокий пульс (${ctx.pulse}) при нулевой активности — классика. Добавь хотя бы 20 минут бодрой ходьбы к твоим ${ctx.activeMinutes} мин.`,
    (ctx: MovementContext) => `Сердце работает на износ (${ctx.pulse}), потому что нет периферической помощи от мышц (${ctx.activeMinutes} мин активности). Спасай ситуацию!`
  ],

  // 1.3 Мало движения + Привес/Отек (delta >= 0)
  movementCritical_WeightGain: [
    (ctx: MovementContext) => `Вес скакнул вверх, а активности всего ${ctx.activeMinutes} мин. Без движения лимфа застаивается, отсюда и отеки!`,
    (ctx: MovementContext) => `${ctx.userName}, твой плюс на весах — это просто стоячая вода. Ты ${t(ctx.userGender, 'двигался', 'двигалась')} всего ${ctx.activeMinutes} мин. Включай лимфодренаж шагами!`,
    (ctx: MovementContext) => `Мало движения (${ctx.activeMinutes} мин) = медленный метаболизм. Калории не горят, вес ползет вверх. Исправим тренировкой?`,
    (ctx: MovementContext) => `Хочешь увидеть минус на весах? Тогда ${ctx.activeMinutes} мин активности нам не хватит. Мышцы должны сжигать гликоген!`,
    (ctx: MovementContext) => `Привес закономерен. При активности в ${ctx.activeMinutes} мин организм складирует энергию, а не тратит ее.`,
    (ctx: MovementContext) => `Твои весы расстроили тебя сегодня? Посмотри на трекер: ${ctx.activeMinutes} мин движения. Лимфа стоит. Иди гулять!`,
    (ctx: MovementContext) => `Чтобы вес начал падать, нужно создать дефицит. А с ${ctx.activeMinutes} мин активности мы его не создадим. ${t(ctx.userGender, 'Поднимайся', 'Поднимайся')}!`,
    (ctx: MovementContext) => `Густая лимфа дает привес на утро. Главный насос для лимфы — это мышцы ног. А у тебя ${ctx.activeMinutes} мин ходьбы. Делай выводы!`,
    (ctx: MovementContext) => `Вес замер, потому что тело в спячке (${ctx.activeMinutes} мин). Разбуди его бодрой пробежкой или зарядкой.`,
    (ctx: MovementContext) => `Плюс на весах уйдет, как только ты начнешь регулярно закрывать цель в ${ctx.dailyGoal} мин. Пока вижу только ${ctx.activeMinutes} мин.`
  ],

  // === ОСЬ 2: В ПРОЦЕССЕ (50% - 90%) ===
  movementProgress: [
    (ctx: MovementContext) => `Уже ${ctx.activeMinutes} мин активности! Хороший темп, ${ctx.userName}. Продолжай в том же духе!`,
    (ctx: MovementContext) => `Экватор пройден! ${ctx.activeMinutes} мин в копилке. Еще немного усилий, и цель будет достигнута.`,
    (ctx: MovementContext) => `Отличная динамика! Твои ${ctx.activeMinutes} мин заставляют кровь бежать быстрее, а легкие дышать глубже.`,
    (ctx: MovementContext) => `Вижу ${ctx.activeMinutes} мин на счетчике. Ты ${t(ctx.userGender, 'молодец', 'умница')}! Растительная энергия работает на тебя.`,
    (ctx: MovementContext) => `Мышцы разогреты, метаболизм ускорен. ${ctx.activeMinutes} мин — прекрасный промежуточный результат!`,
    (ctx: MovementContext) => `Осталось совсем чуть-чуть до цели в ${ctx.dailyGoal} мин. ${ctx.activeMinutes} мин уже сделано. Не сбавляй темп!`,
    (ctx: MovementContext) => `Каждая минута движения делает тебя здоровее. ${ctx.activeMinutes} мин — это уже отличный вклад в долголетие.`,
    (ctx: MovementContext) => `Горжусь твоим настроем! ${ctx.activeMinutes} мин активности. Тело благодарно тебе за эту работу.`,
    (ctx: MovementContext) => `${ctx.userName}, ты на правильном пути. ${ctx.activeMinutes} мин позади, впереди бодрость и легкость!`,
    (ctx: MovementContext) => `Отличная работа с телом сегодня. ${ctx.activeMinutes} мин движения обеспечат тебе крепкий сон ночью.`
  ],

  // === ОСЬ 3: ЦЕЛЬ ВЫПОЛНЕНА (>= 100%) ===

  // 3.1 Просто выполнено (Без триггеров)
  movementGoalReached_Base: [
    (ctx: MovementContext) => `Цель выполнена! ${ctx.activeMinutes} мин активности. Твое сердце и сосуды сегодня стали чуточку сильнее.`,
    (ctx: MovementContext) => `Браво, ${ctx.userName}! Дневная норма активности закрыта. Горжусь твоей дисциплиной!`,
    (ctx: MovementContext) => `Прекрасный результат — ${ctx.activeMinutes} мин! Физическая активность и WFPB-рацион творят чудеса вместе.`,
    (ctx: MovementContext) => `Ты ${t(ctx.userGender, 'настоящий чемпион', 'настоящая чемпионка')}! Цель в ${ctx.dailyGoal} мин побита. Обожаю твою целеустремленность.`,
    (ctx: MovementContext) => `Норма движения выполнена! ${ctx.activeMinutes} мин. Митохондрии в твоих клетках ликуют и вырабатывают энергию.`,
    (ctx: MovementContext) => `Супер! ${ctx.activeMinutes} мин активности. Эндорфины обеспечены, стресс снят. Отличный день!`,
    (ctx: MovementContext) => `Цель по движению покорена! Ты отлично ${t(ctx.userGender, 'справился', 'справилась')}. Твоя сердечно-сосудистая система в безопасности.`,
    (ctx: MovementContext) => `Мощно! ${ctx.activeMinutes} мин движения — это крепкий иммунитет и идеальное пищеварение.`,
    (ctx: MovementContext) => `Радуюсь твоим ${ctx.activeMinutes} мин. Это лучший вклад в твою форму и хорошее настроение.`,
    (ctx: MovementContext) => `100% результат! ${ctx.activeMinutes} мин. Теперь можно с чистой совестью отдыхать и восстанавливаться.`
  ],

  // 3.2 Выполнено + Отвес (delta < 0)
  movementGoalReached_WeightLoss: [
    (ctx: MovementContext) => `Норма движения закрыта (${ctx.activeMinutes} мин), и вес пошел вниз! Идеальное подтверждение: мышцы сожгли лишнее.`,
    (ctx: MovementContext) => `${ctx.userName}, ты ${t(ctx.userGender, 'отработал', 'отработала')} ${ctx.activeMinutes} мин, и тело ответило шикарным отвесом. Бинго!`,
    (ctx: MovementContext) => `Цель достигнута, а весы показали минус! Твои ${ctx.activeMinutes} мин активности запустили процесс жиросжигания.`,
    (ctx: MovementContext) => `Секрет раскрыт: растительное питание плюс ${ctx.activeMinutes} мин движения равно стабильное похудение.`,
    (ctx: MovementContext) => `Вижу отвес и вижу ${ctx.activeMinutes} мин активности. Лимфа разогнана, калории потрачены. Идеально!`,
    (ctx: MovementContext) => `Твои усилия (${ctx.activeMinutes} мин) напрямую конвертировались в сброшенный вес. Ты ${t(ctx.userGender, 'хакнул', 'хакнула')} свой метаболизм!`,
    (ctx: MovementContext) => `Отвес на весах — это награда за твои сегодняшние ${ctx.activeMinutes} мин движения. Продолжай эту победную серию!`,
    (ctx: MovementContext) => `Активность ${ctx.activeMinutes} мин сделала свое дело: застои ушли, вес упал. Горжусь твоим подходом к телу.`,
    (ctx: MovementContext) => `Минус на весах мотивирует, правда? А всё благодаря твоей дисциплине и ${ctx.activeMinutes} мин движения!`,
    (ctx: MovementContext) => `Трекер показывает ${ctx.activeMinutes} мин, а график веса летит вниз. Это двойная победа, ${ctx.userName}!`
  ],
  // === ОСЬ 4: ГИБРИДНЫЕ ВЕТКИ (Кросс-триггеры) ===

  // 4.1 Малоподвижность + Запор в ЖКТ -> движение — лучший массаж для кишечника
  movementSedentaryConstipation: [
    (ctx: MovementContext) => `${ctx.userName}, перистальтика спит (тип ${ctx.summary.digestion.worstBristol ?? "—"}), и активность почти на нуле (${ctx.activeMinutes} мин). Движение — лучший массаж для кишечника. Вставай и пройдись!`,
    (ctx: MovementContext) => `По общей сводке: замедленный ЖКТ + минимум движения. Кишечник включается от ходьбы — сделай 10 минут пешком, и моторика проснется!`,
    (ctx: MovementContext) => `Сидячий день (${ctx.activeMinutes} мин) напрямую душит твою перистальтику (тип ${ctx.summary.digestion.worstBristol ?? "—"}). Прогулка сейчас — лучшее лекарство от запора!`
  ],

  // 4.2 Норма движения + Высокий тонус -> активный день зарядил батарейки
  movementActiveTonusHigh: [
    (ctx: MovementContext) => `${ctx.userName}, твой активный день (${ctx.activeMinutes} мин) зарядил батарейки — тонус по замерам на высоте! Вот он, идеальный баланс движения и самочувствия. Так держать!`,
    (ctx: MovementContext) => `Вижу идеальную картину: ${ctx.activeMinutes} мин активности и отличный тонус по замерам. Движение подарило тебе энергию — зафиксируй этот рецепт!`
  ],

  // 4.3 Норма движения + Низкий тонус -> возможно перестарался, нужен отдых/еда/сон
  movementActiveTonusLow: [
    (ctx: MovementContext) => `Молодец за активность (${ctx.activeMinutes} мин), но тонус по замерам упал. Возможно, ты ${t(ctx.userGender, 'перестарался', 'перестаралась')} — восстанови энергию теплой едой и ранним сном!`,
    (ctx: MovementContext) => `Движения достаточно (${ctx.activeMinutes} мин), а силы на нуле. Организм просит восстановления: углеводы, отдых и сон важнее сегодня новых рекордов.`,
    (ctx: MovementContext) => `Ты ${t(ctx.userGender, 'выполнил', 'выполнила')} норму движения, но тело сигналит об усталости. Дай себе восстановиться — баланс важнее перфекционизма.`
  ]
};

export const getRandomPhrase = (category: keyof typeof MOVEMENT_PHRASES, ctx: MovementContext): string => {
  const phrases = MOVEMENT_PHRASES[category];
  if (!phrases || phrases.length === 0) return "";
  return phrases[Math.floor(Math.random() * phrases.length)](ctx);
};
