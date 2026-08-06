export interface MeasurementContext {
  userName: string;
  userGender: 'male' | 'female';
  pulse: number | null;
  weight: number | null;
  initialWeight: number | null;
  weightDelta: number | null;
  tonusEnergy: string | null;
  tonusMood: string | null;
  tonusWellbeing: string | null;
}

export const numberToText = (num: number, type: 'pulse' | 'weight' | 'delta'): string => {
  const getDeclension = (n: number, titles: [string, string, string]) => {
    const cases = [2, 0, 1, 1, 1, 2];
    return titles[(n % 100 > 4 && n % 100 < 20) ? 2 : cases[(n % 10 < 5) ? n % 10 : 5]];
  };
  if (type === 'pulse') return `${Math.round(num)} ${getDeclension(Math.round(num), ['удар', 'удара', 'ударов'])} в минуту`;
  const absNum = Math.abs(num);
  const kg = Math.floor(absNum);
  const grams = Math.round((absNum - kg) * 1000);
  if (type === 'delta' && kg === 0) return `${grams} ${getDeclension(grams, ['грамм', 'грамма', 'граммов'])}`;
  let res = `${kg} ${getDeclension(kg, ['килограмм', 'килограмма', 'килограммов'])}`;
  if (grams > 0) res += ` ${grams} ${getDeclension(grams, ['грамм', 'грамма', 'граммов'])}`;
  return res;
};

const t = (gender: 'male' | 'female', maleWord: string, femaleWord: string) => gender === 'male' ? maleWord : femaleWord;

export const PHRASE_MATRIX = {
  pulseHigh: [
    (ctx: MeasurementContext) => `${ctx.userName}, я смотрю на твой пульс — ${numberToText(ctx.pulse!, 'pulse')}. Это высоковато для покоя. Ты не ${t(ctx.userGender, 'перенервничал', 'перенервничала')} сегодня?`,
    (ctx: MeasurementContext) => `Пульс ${numberToText(ctx.pulse!, 'pulse')} — сердечко бьется чаще обычного. Возможно, это реакция на скрытую соль в еде или недосып. Давай понаблюдаем.`,
    (ctx: MeasurementContext) => `Пульс ${numberToText(ctx.pulse!, 'pulse')} говорит о напряжении в организме. Обязательно ${t(ctx.userGender, 'сделай', 'сделай')} акцент на отдых сегодня.`,
    (ctx: MeasurementContext) => `Твой пульс сегодня ${ctx.pulse}. Мне кажется, сосудам сейчас тяжело. Проверь, достаточно ли воды ты пьёшь?`,
    (ctx: MeasurementContext) => `${ctx.userName}, ${ctx.pulse} ударов в минуту — это сигнал. Если тренировки не было, значит, нервная система перегружена.`,
    (ctx: MeasurementContext) => `Вижу пульс ${ctx.pulse}. Это чуть выше нашей зелёной зоны. Постарайся сегодня обойтись без кофеина и плотных ужинов.`,
    (ctx: MeasurementContext) => `Пульс ${ctx.pulse}. Сердце работает с усилием. Я думаю, легкая прогулка на свежем воздухе сейчас бы очень помогла.`,
    (ctx: MeasurementContext) => `Твой моторчик бьется на ${ctx.pulse} ударов. Давай сегодня побережем себя и устроим максимально расслабленный вечер.`,
    (ctx: MeasurementContext) => `Смотрю на пульс ${ctx.pulse}... Если ты не после пробежки, то это признак стресса или пищевой перегрузки.`,
    (ctx: MeasurementContext) => `Пульс ${ctx.pulse}. На растительном питании без соли он обычно ниже. Вспомни, не было ли вчера срывов на соленую или тяжелую еду?`
  ],
  pulseNormal: [
    (ctx: MeasurementContext) => `Пульс ${numberToText(ctx.pulse!, 'pulse')} — отличная работа! Сосуды расслаблены.`,
    (ctx: MeasurementContext) => `Твой пульс ${ctx.pulse} — это идеальная кардио-норма. Растительный рацион делает своё дело!`,
    (ctx: MeasurementContext) => `${ctx.userName}, пульс ${ctx.pulse}! Прямо как у космонавта. Горжусь тобой.`,
    (ctx: MeasurementContext) => `Вижу прекрасный пульс — ${ctx.pulse} уд/мин. Сердечко работает ровно и спокойно.`,
    (ctx: MeasurementContext) => `Пульс ${ctx.pulse}. Это идеальный показатель чистого, несоленого питания. Так держать!`,
    (ctx: MeasurementContext) => `Замечательный пульс сегодня (${ctx.pulse}). Организм явно скажет тебе спасибо за такую заботу.`,
    (ctx: MeasurementContext) => `Смотрю на твои ${ctx.pulse} ударов и радуюсь. Сосуды чистые, давление в норме!`,
    (ctx: MeasurementContext) => `Пульс ${ctx.pulse} — это показатель того, что ты на правильном пути.`,
    (ctx: MeasurementContext) => `Твой пульс в норме (${ctx.pulse}). Значит, ты отлично ${t(ctx.userGender, 'справился', 'справилась')} со стрессом и питанием сегодня!`,
    (ctx: MeasurementContext) => `Идеальный пульс (${ctx.pulse}). Продолжай в том же духе, это лучшее вложение в свое здоровье.`
  ],
  weightLoss: [
    (ctx: MeasurementContext) => `Отличные новости! Минус ${numberToText(Math.abs(ctx.weightDelta!), 'delta')} от старта. Ты уверенно идёшь к цели.`,
    (ctx: MeasurementContext) => `Вес снизился до ${numberToText(ctx.weight!, 'weight')}. Растительное питание отлично сгоняет лишнюю воду!`,
    (ctx: MeasurementContext) => `${ctx.userName}, ты просто ${t(ctx.userGender, 'молодец', 'умница')}! Минус ${numberToText(Math.abs(ctx.weightDelta!), 'delta')} — это супер результат.`,
    (ctx: MeasurementContext) => `Вижу минус на весах! Главное сейчас — не ${t(ctx.userGender, 'сорваться', 'сорваться')} на солененькое.`,
    (ctx: MeasurementContext) => `Твой вес сейчас ${ctx.weight} кг. Процесс идет прекрасно, лишний балласт уходит.`,
    (ctx: MeasurementContext) => `Ушли очередные граммы (-${Math.abs(ctx.weightDelta!).toFixed(1)} кг от старта). Я очень рада видеть такую динамику!`,
    (ctx: MeasurementContext) => `Вес падает (${ctx.weight} кг). Это верный признак того, что микрофлора очищается.`,
    (ctx: MeasurementContext) => `Минус ${numberToText(Math.abs(ctx.weightDelta!), 'delta')}! Твой организм с благодарностью отдает лишнее.`,
    (ctx: MeasurementContext) => `Потрясающая динамика. Вес ${ctx.weight} кг доказывает, что чистая еда работает лучше любых диет.`,
    (ctx: MeasurementContext) => `Ты ${t(ctx.userGender, 'сделал', 'сделала')} это! Минус ${Math.abs(ctx.weightDelta!).toFixed(1)} кг. Продолжаем в том же духе!`
  ],
  weightGainOrPlateau: [
    (ctx: MeasurementContext) => `Вес сейчас ${ctx.weight} кг. Не ${t(ctx.userGender, 'переживай', 'расстраивайся')}, если цифра стоит на месте или чуть выросла — чаще всего это просто задержавшаяся вода.`,
    (ctx: MeasurementContext) => `Твой вес ${ctx.weight} кг. Вспомни, не ${t(ctx.userGender, 'ел', 'ела')} ли ты вчера скрытую соль?`,
    (ctx: MeasurementContext) => `Вижу вес ${ctx.weight} кг. Главное — держим чистый рацион, и вода обязательно уйдет.`,
    (ctx: MeasurementContext) => `${ctx.userName}, небольшие колебания веса — это абсолютная норма. Продолжаем питаться правильно!`,
    (ctx: MeasurementContext) => `Вес зафиксировался на ${ctx.weight} кг. Дай организму время перестроить обмен веществ.`,
    (ctx: MeasurementContext) => `Смотрю на твой вес (${ctx.weight} кг). Не обращай внимания на локальные скачки, важен долгосрочный тренд.`,
    (ctx: MeasurementContext) => `Вес ${ctx.weight} кг. Если чувствуешь отёчность, я думаю, стоит увеличить количество свежей зелени в рационе.`,
    (ctx: MeasurementContext) => `Твой вес сегодня ${ctx.weight} кг. Всё под контролем, продолжаем наш зеленый путь!`,
    (ctx: MeasurementContext) => `Цифра на весах (${ctx.weight} кг) — это не повод для грусти. Организм иногда запасает воду для восстановления.`,
    (ctx: MeasurementContext) => `Вес ${ctx.weight} кг. Давай сегодня сделаем акцент на легкие супы и уберем плотные жиры на ужин.`
  ],
  tonusLow: [
    (ctx: MeasurementContext) => `Вижу, что тонус сегодня тяжелый. Давай сфокусируемся на легкой, теплой еде и отдыхе.`,
    (ctx: MeasurementContext) => `Тяжелое состояние — это тоже нормально. Организм перестраивается. Выпей теплого травяного чая.`,
    (ctx: MeasurementContext) => `Мне кажется, ты сегодня ${t(ctx.userGender, 'вымотан', 'вымотана')}. Сон сейчас важнее любой тренировки.`,
    (ctx: MeasurementContext) => `${ctx.userName}, постарайся сегодня лечь спать пораньше. Твоему телу нужна перезагрузка.`,
    (ctx: MeasurementContext) => `Плохое самочувствие часто бывает при переходе на чистое питание (эффект детокса). Держись!`,
    (ctx: MeasurementContext) => `Смотрю на твой тонус и хочу сказать: разреши себе сегодня просто полениться.`,
    (ctx: MeasurementContext) => `Энергия на нуле. Возможно, не хватает сложных углеводов. Как насчет тарелки теплой гречки?`,
    (ctx: MeasurementContext) => `Вижу спад по настроению и силам. Не ${t(ctx.userGender, 'требуй', 'требуй')} от себя невозможного сегодня.`,
    (ctx: MeasurementContext) => `Тяжелый день? Я с тобой. Помни, что каждый такой день делает тебя сильнее.`,
    (ctx: MeasurementContext) => `Организм просит пощады. Давай уберем сегодня все стрессовые задачи.`
  ],
  tonusHigh: [
    (ctx: MeasurementContext) => `Энергия бьет ключом! Идеальный день, чтобы свернуть горы.`,
    (ctx: MeasurementContext) => `Отличный тонус! Вот она — истинная сила цельного растительного питания.`,
    (ctx: MeasurementContext) => `${ctx.userName}, радуюсь твоему шикарному самочувствию! Так держать.`,
    (ctx: MeasurementContext) => `Вижу легкое настроение и море энергии. Прекрасный момент для хорошей прогулки!`,
    (ctx: MeasurementContext) => `Твой тонус сегодня просто супер. Это лучшая награда за правильные пищевые привычки.`,
    (ctx: MeasurementContext) => `Как же приятно видеть твой позитивный настрой! Организм работает как часы.`,
    (ctx: MeasurementContext) => `Сил много, настроение ровное. Ты на пике формы сегодня!`,
    (ctx: MeasurementContext) => `Отличное самочувствие — это твой личный успех. Ты ${t(ctx.userGender, 'заслужил', 'заслужила')} это своим трудом.`,
    (ctx: MeasurementContext) => `Прекрасный тонус! Пусть весь день пройдет так же легко и позитивно.`,
    (ctx: MeasurementContext) => `Вижу, что батарейка заряжена на 100%. Отличный день для новых свершений!`
  ]
};

export const getRandomPhrase = (category: keyof typeof PHRASE_MATRIX, ctx: MeasurementContext): string => {
  const phrases = PHRASE_MATRIX[category];
  if (!phrases || phrases.length === 0) return "";
  const randomIndex = Math.floor(Math.random() * phrases.length);
  return phrases[randomIndex](ctx);
};
