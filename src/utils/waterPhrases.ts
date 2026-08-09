import { DailySummary } from "./crossModuleSummary";

export interface WaterContext {
  userName?: string;
  userGender?: 'male' | 'female';
  summary: DailySummary;
  waterAmount: number;
  waterGoal: number;
  pulse: number | null;
  weightDelta: number | null; // Отрицательное = отвес
}

export const t = (gender: 'male' | 'female', m: string, f: string) => gender === 'male' ? m : f;

export const WATER_PHRASES = {
  waterCritical_Base: [
    (ctx: WaterContext) => `${ctx.userName}, выпито всего ${ctx.waterAmount} мл. Твой организм сейчас работает на сухую. Пожалуйста, ${t(ctx.userGender, 'сделай', 'сделай')} пару глотков прямо сейчас!`,
    (ctx: WaterContext) => `Вижу на счетчике ${ctx.waterAmount} мл из ${ctx.waterGoal}. Это очень мало. Вода — главный растворитель, без нее не уйдут ни токсины, ни вес.`,
    (ctx: WaterContext) => `Ты ${t(ctx.userGender, 'выпил', 'выпила')} только ${ctx.waterAmount} мл. Растительная клетчатка требует много жидкости, иначе будут проблемы с пищеварением.`,
    (ctx: WaterContext) => `${ctx.userName}, водный баланс сильно проседает. Поставь стакан или бутылку на видное место, чтобы не забывать пить.`,
    (ctx: WaterContext) => `Всего ${ctx.waterAmount} мл? Организм обезвожен. Давай срочно исправлять ситуацию, чистая вода творит чудеса.`,
    (ctx: WaterContext) => `Смотрю на твой водный трекер и расстраиваюсь. ${ctx.waterAmount} мл — это критически мало для здоровья сосудов.`,
    (ctx: WaterContext) => `Пока выпито ${ctx.waterAmount} мл. Не жди чувства жажды — когда оно появляется, клетки уже страдают от нехватки воды.`,
    (ctx: WaterContext) => `Твоя цель ${ctx.waterGoal} мл, а выпито лишь ${ctx.waterAmount}. Давай сделаем паузу на 5 минут и выпьем теплой воды.`,
    (ctx: WaterContext) => `Воды катастрофически не хватает (${ctx.waterAmount} мл). На WFPB-рационе это особенно важно для очищения рецепторов!`,
    (ctx: WaterContext) => `Вижу ${ctx.waterAmount} мл. Ты ${t(ctx.userGender, 'забыл', 'забыла')} про водичку? Самое время освежиться.`
  ],
  waterCritical_HighPulse: [
    (ctx: WaterContext) => `Выпито всего ${ctx.waterAmount} мл, а пульс сегодня ${ctx.pulse}. Неудивительно! Густая кровь заставляет сердце биться чаще. Срочно пей воду!`,
    (ctx: WaterContext) => `${ctx.userName}, твой пульс ${ctx.pulse} может быть прямым следствием обезвоживания (${ctx.waterAmount} мл). Сердцу тяжело качать густую кровь.`,
    (ctx: WaterContext) => `Пульс ${ctx.pulse} и всего ${ctx.waterAmount} мл воды. Это опасная связка. Пожалуйста, выпей большой стакан чистой воды, чтобы снять спазм.`,
    (ctx: WaterContext) => `Обезвоживание налицо (${ctx.waterAmount} мл), отсюда и пульс подскочил до ${ctx.pulse}. Давай поможем сердцу и нальем воды.`,
    (ctx: WaterContext) => `Вижу пульс ${ctx.pulse} при выпитых ${ctx.waterAmount} мл. Организм включает режим паники. Медленно, маленькими глотками выпей теплой воды.`,
    (ctx: WaterContext) => `Твое сердце работает на износ (пульс ${ctx.pulse}), потому что ему не хватает жидкости (${ctx.waterAmount} мл). Исправляй немедленно!`,
    (ctx: WaterContext) => `Связка "мало воды и высокий пульс" — это классика. Выпито ${ctx.waterAmount} мл. ${t(ctx.userGender, 'Напои', 'Напои')} свои клетки, и пульс успокоится.`,
    (ctx: WaterContext) => `Пульс ${ctx.pulse} — это крик о помощи. При ${ctx.waterAmount} мл крови не хватает объема. Срочно стакан воды!`,
    (ctx: WaterContext) => `Если пульс ${ctx.pulse}, а выпито ${ctx.waterAmount} мл, значит сосуды сузились. Вода — лучшее природное лекарство сейчас.`,
    (ctx: WaterContext) => `${ctx.userName}, не пугай меня таким пульсом (${ctx.pulse}) на фоне засухи (${ctx.waterAmount} мл). Иди на кухню за водой!`
  ],
  waterCritical_WeightGain: [
    (ctx: WaterContext) => `Вес скакнул вверх, а воды выпито мало (${ctx.waterAmount} мл). Организм в стрессе и запасает каждую каплю. Начни пить, чтобы снять отечность!`,
    (ctx: WaterContext) => `Привес на весах часто бывает из-за недобора воды. Ты ${t(ctx.userGender, 'выпил', 'выпила')} ${ctx.waterAmount} мл, поэтому тело удерживает жидкость.`,
    (ctx: WaterContext) => `Мало воды (${ctx.waterAmount} мл) = отеки и плюс на весах. Чтобы вода уходила, она должна поступать в достатке!`,
    (ctx: WaterContext) => `${ctx.userName}, хочешь избавиться от плюса на весах? Перестань сушить организм. ${ctx.waterAmount} мл — это гарантия отеков на утро.`,
    (ctx: WaterContext) => `Вес стоит, потому что выпито ${ctx.waterAmount} мл. Организм не отдаст токсины и лишний вес без хорошего промывания.`,
    (ctx: WaterContext) => `Вижу задержку веса. Это логично при ${ctx.waterAmount} мл выпитой воды. Тело боится обезвоживания и копит запасы.`,
    (ctx: WaterContext) => `Если ${t(ctx.userGender, 'расстроен', 'расстроена')} из-за веса, посмотри на воду: всего ${ctx.waterAmount} мл! Пей больше, чтобы включить лимфодренаж.`,
    (ctx: WaterContext) => `Парадокс, но чтобы слить лишнюю воду (и убрать привес), нужно много пить. А у тебя пока ${ctx.waterAmount} мл.`,
    (ctx: WaterContext) => `Твой плюс на весах — это просто густая лимфа из-за нехватки жидкости (${ctx.waterAmount} мл). Исправим это парой стаканов!`,
    (ctx: WaterContext) => `Отеки неизбежны, если норма не выполнена. ${ctx.waterAmount} мл за сегодня — давай поднажмем, чтобы завтра вес порадовал.`
  ],
  waterProgress: [
    (ctx: WaterContext) => `Водный баланс пополнен на ${ctx.waterAmount} мл. Отличный темп, ${ctx.userName}! Не забывай пить по глоточку между делами.`,
    (ctx: WaterContext) => `Почти у цели! Выпито ${ctx.waterAmount} мл. Чистая вода — это лучшая помощь метаболизму.`,
    (ctx: WaterContext) => `Темп хороший, на счетчике ${ctx.waterAmount} мл. Растительной клетчатке в твоем кишечнике сейчас очень комфортно.`,
    (ctx: WaterContext) => `${ctx.userName}, ты ${t(ctx.userGender, 'выпил', 'выпила')} ${ctx.waterAmount} мл. Еще немного, и норма будет закрыта!`,
    (ctx: WaterContext) => `Вижу ${ctx.waterAmount} мл. Ты ${t(ctx.userGender, 'молодец', 'умница')}, уверенно движешься к цели ${ctx.waterGoal} мл.`,
    (ctx: WaterContext) => `Держишь ритм! ${ctx.waterAmount} мл воды помогут сохранить энергию до самого вечера.`,
    (ctx: WaterContext) => `Промежуточный результат отличный — ${ctx.waterAmount} мл. Каждая капля работает на здоровье твоих сосудов.`,
    (ctx: WaterContext) => `Ты на верном пути. Выпито ${ctx.waterAmount} мл, тело увлажняется и очищается от шлаков.`,
    (ctx: WaterContext) => `Хорошая динамика! ${ctx.waterAmount} мл уже внутри. Продолжай пить чистую воду без газа.`,
    (ctx: WaterContext) => `Осталось совсем чуть-чуть до ${ctx.waterGoal} мл. Твои почки уже говорят тебе спасибо за эти ${ctx.waterAmount} мл!`
  ],
  waterGoalReached_Base: [
    (ctx: WaterContext) => `Цель выполнена! ${ctx.waterAmount} мл чистой воды. Горжусь тобой. Твои почки и сосуды работают как часы.`,
    (ctx: WaterContext) => `Браво, ${ctx.userName}! Дневная норма воды закрыта (${ctx.waterAmount} мл). Это мощнейший вклад в твое здоровье.`,
    (ctx: WaterContext) => `Норма взята! ${ctx.waterAmount} мл — идеальное промывание для организма на WFPB-рационе.`,
    (ctx: WaterContext) => `Ты ${t(ctx.userGender, 'настоящий чемпион', 'настоящая чемпионка')}! Цель по воде достигнута (${ctx.waterAmount} мл).`,
    (ctx: WaterContext) => `Вижу ${ctx.waterAmount} мл на счетчике. Идеальная дисциплина! Кровь жидкая, давление стабильное.`,
    (ctx: WaterContext) => `Супер результат! ${ctx.waterAmount} мл выпито. Это значит, что метаболизм сегодня работает на максимальных оборотах.`,
    (ctx: WaterContext) => `Цель по воде (${ctx.waterGoal} мл) покорена! Ты отлично ${t(ctx.userGender, 'справился', 'справилась')} с этой задачей.`,
    (ctx: WaterContext) => `Мощно! ${ctx.waterAmount} мл чистой воды — это сияющая кожа и здоровое сердце.`,
    (ctx: WaterContext) => `Радуюсь твоим ${ctx.waterAmount} мл. Водный баланс — это фундамент, и он у тебя сегодня железобетонный!`,
    (ctx: WaterContext) => `Стопроцентное выполнение! ${ctx.waterAmount} мл. Ты ${t(ctx.userGender, 'выстроил', 'выстроила')} отличную привычку пить воду.`
  ],
  waterGoalReached_WeightLoss: [
    (ctx: WaterContext) => `Норма выпита (${ctx.waterAmount} мл), и вес пошел вниз! Идеальная иллюстрация того, как вода помогает худеть на растительном рационе.`,
    (ctx: WaterContext) => `${ctx.userName}, ты ${t(ctx.userGender, 'выпил', 'выпила')} ${ctx.waterAmount} мл, и тело с благодарностью отдало лишние граммы. Шикарная связка!`,
    (ctx: WaterContext) => `Цель по воде закрыта, отвес зафиксирован! Твои ${ctx.waterAmount} мл отлично вымыли застои и соли.`,
    (ctx: WaterContext) => `Минус на весах и ${ctx.waterAmount} мл на счетчике воды. Вот он — секрет здорового похудения без насилия над собой.`,
    (ctx: WaterContext) => `Как только ты ${t(ctx.userGender, 'начал', 'начала')} пить норму (${ctx.waterAmount} мл), вес сразу ответил снижением. Идеальная работа!`,
    (ctx: WaterContext) => `Вижу отвес и вижу ${ctx.waterAmount} мл выпитой воды. Одно напрямую связано с другим. Ты ${t(ctx.userGender, 'взломал', 'взломала')} систему!`,
    (ctx: WaterContext) => `Твои ${ctx.waterAmount} мл сработали как лучший детокс — вес падает. Продолжай в том же духе!`,
    (ctx: WaterContext) => `Вода (${ctx.waterAmount} мл) убрала отеки, и весы это подтвердили. Великолепный результат сегодня.`,
    (ctx: WaterContext) => `Счетчик воды на ${ctx.waterAmount} мл, график веса идет вниз. Это двойная победа, ${ctx.userName}!`,
    (ctx: WaterContext) => `Растительная еда плюс ${ctx.waterAmount} мл воды — и лишние граммы тают на глазах. Горжусь твоей дисциплиной.`
  ],
  // ГИБРИДНЫЕ ВЕТКИ (Кросс-триггеры)
  waterDeficitConstipation: [
    (ctx: WaterContext) => `${ctx.userName}, тревога! Водный недобор (${ctx.waterAmount} мл) спровоцировал остановку ЖКТ — по сводке вижу замедленный стул (тип ${ctx.summary.digestion.worstBristol ?? "—"}). Клетчатка без воды превращается в бетон. Срочно выпей стакан теплой воды!`,
    (ctx: WaterContext) => `Смотрю на общую картину и вижу опасную связку: мало воды (${ctx.waterAmount} мл) + запор. Твой кишечник застрял именно из-за обезвоживания. Немедленно пей!`
  ],
  waterOKTonusLow: [
    (ctx: WaterContext) => `Водный баланс отличный (${ctx.waterAmount} мл), но по замерам я вижу низкий тонус. Вода не заменит сон и углеводы — давай сегодня полегче с нагрузками и пораньше спать.`,
    (ctx: WaterContext) => `${ctx.userName}, воды в достатке, молодец! Но энергии нет. Это не про гидратацию — добавь теплой каши на ужин и позволь себе отдохнуть.`
  ],
  waterNormalDigestionIdeal: [
    (ctx: WaterContext) => `${ctx.userName}, идеальная связка дня! Водный баланс закрыт (${ctx.waterAmount} мл), и ЖКТ работает как часы (тип ${ctx.summary.digestion.latestBristol ?? "—"}). Именно так выглядит идеальная гидратация — клетчатка разбухла и проталкивает всё как надо!`,
    (ctx: WaterContext) => `Вижу гармонию: норму воды ты ${t(ctx.userGender, 'выполнил', 'выполнила')} (${ctx.waterAmount} мл), и пищеварение отвечает идеальным транзитом. Зафиксируй этот день как эталонный!`
  ]
};

export const getRandomPhrase = (category: keyof typeof WATER_PHRASES, ctx: WaterContext): string => {
  const phrases = WATER_PHRASES[category];
  if (!phrases || phrases.length === 0) return "";
  return phrases[Math.floor(Math.random() * phrases.length)](ctx);
};
