// src/utils/digestionPhrases.ts

import { getGenderVerb } from "./textUtils";
import { DailySummary } from "./crossModuleSummary";

// Интерфейс контекста для Анны (теперь опирается на единую сводку)
export interface DigestionContext {
  userName?: string;
  userGender?: string;
  summary: DailySummary;
}

// -----------------------------------------------------------------------------
// Вспомогательные функции для словаря
// -----------------------------------------------------------------------------
export const getGreeting = (ctx: DigestionContext): string => {
  const name = ctx.userName ? `, ${ctx.userName}` : "";
  return [
    `Смотрю на твои записи${name}.`,
    `Анализирую твой дневник пищеварения${name}.`,
    `Вижу свежие данные по ЖКТ${name}.`,
    `Оценила работу твоего кишечника${name}.`,
    `Привет${name}! Посмотрела твои логи.`,
    `Давай разберем твое пищеварение${name}.`,
    `Изучила твою статистику${name}.`,
    `Смотрю на графики транзита${name}.`,
    `Обратила внимание на твои замеры${name}.`,
    `Анализирую отклик твоего ЖКТ${name}.`
  ][Math.floor(Math.random() * 10)];
};

export const getRandomPhrase = (phrases: ((ctx: DigestionContext) => string)[]): (ctx: DigestionContext) => string => {
  return phrases[Math.floor(Math.random() * phrases.length)];
};

// -----------------------------------------------------------------------------
// БАЗА ЗНАНИЙ (Матрица фраз Анны по модулю Пищеварение)
// -----------------------------------------------------------------------------

export const DIGESTION_PHRASE_MATRIX = {
  // БЛОК 1: ИДЕАЛЬНЫЙ ТРАНЗИТ (Бристоль 3, 4, 5)
  ideal_transit: {
    perfect: [
      (ctx: DigestionContext) => `${getGreeting(ctx)} Идеальный отклик! Последний тип ${ctx.summary.digestion.worstBristol} подтверждает великолепную моторику. Обилие клетчатки (WFPB) формирует идеальный здоровый стул.`,
      (ctx: DigestionContext) => `${getGreeting(ctx)} Тип ${ctx.summary.digestion.worstBristol} — это золотой стандарт. Твоя микрофлора ликует. Отличная гидратация и нужное количество клетчатки делают свое дело!`,
      (ctx: DigestionContext) => `${getGreeting(ctx)} Работает как часы! Тип ${ctx.summary.digestion.worstBristol} и отсутствие дискомфорта — признак того, что кишечник полностью адаптировался к растительному рациону.`
    ],
    with_symptoms: [
      (ctx: DigestionContext) => `${getGreeting(ctx)} Стул в норме (тип ${ctx.summary.digestion.worstBristol}), но вижу симптомы: ${ctx.summary.digestion.symptoms.join(', ')}. На WFPB это частая история адаптации — микрофлора перестраивается.`,
      (ctx: DigestionContext) => `${getGreeting(ctx)} Тип ${ctx.summary.digestion.worstBristol} отличный, однако присутствует дискомфорт (${ctx.summary.digestion.symptoms.join(', ')}). Попробуй пить теплую воду перед едой и тщательнее пережевывать пищу.`
    ],
    low_energy: [
      (ctx: DigestionContext) => `${getGreeting(ctx)} Стул эталонный (тип ${ctx.summary.digestion.worstBristol}), кишечник работает как часы. Но я вижу по общей сводке замеров, что у тебя нет сил. Дело не в пищеварении — давай проверим углеводы в рационе или дадим тебе отоспаться.`,
      (ctx: DigestionContext) => `${getGreeting(ctx)} Транзит идеальный (${ctx.summary.digestion.worstBristol}), но твой тонус сейчас на нуле. Кишечник свою работу сделал, теперь нужно восстановить общую энергию тела.`
    ]
  },

  // БЛОК 2: ЗАМЕДЛЕННЫЙ ТРАНЗИТ / ЗАПОР (Бристоль 1, 2)
  constipation: {
    dehydrated: [
      (ctx: DigestionContext) => `${getGreeting(ctx)} Транзит замедлен (тип ${ctx.summary.digestion.worstBristol}). Я смотрю на общую сводку и вижу сильный недобор воды! Клетчатка без влаги превращается в бетон. Срочно выпей стакан теплой воды.`,
      (ctx: DigestionContext) => `${getGreeting(ctx)} Стул плотный (тип ${ctx.summary.digestion.worstBristol}). Ты ${getGenderVerb(ctx.userGender, 'забыл', 'забыла')} про питьевой баланс. Без влаги ЖКТ не может продвигать растительную пищу. Пей воду!`
    ],
    sedentary: [
      (ctx: DigestionContext) => `${getGreeting(ctx)} Воды достаточно, но перистальтика спит (тип ${ctx.summary.digestion.worstBristol}). В твоей сводке активности за сегодня почти нули! Сделай 10-минутную разминку, чтобы запустить ЖКТ!`,
      (ctx: DigestionContext) => `${getGreeting(ctx)} Транзит запаздывает (${ctx.summary.digestion.worstBristol}). По сводке вижу, что ты мало ${getGenderVerb(ctx.userGender, 'двигался', 'двигалась')}. Физическая активность критически важна для моторики кишечника.`
    ],
    hydrated: [
      (ctx: DigestionContext) => `${getGreeting(ctx)} Транзит ленивый (тип ${ctx.summary.digestion.worstBristol}), хотя с водой и активностью всё в порядке. Нам нужно больше зелени, чтобы запустить моторику.`,
      (ctx: DigestionContext) => `${getGreeting(ctx)} Стул плотный (тип ${ctx.summary.digestion.worstBristol}). Возможно, в рационе преобладают крахмалы (рис, картофель). Добавь больше листового салата и сырой моркови.`
    ],
    low_tonus: [
      (ctx: DigestionContext) => `${getGreeting(ctx)} Транзит замедлен (${ctx.summary.digestion.worstBristol}). По сводке замеров я вижу, что твой тонус сегодня низкий. Замедленный стул часто сопровождает усталость — отдохни и добавь теплой пищи.`,
      (ctx: DigestionContext) => `${getGreeting(ctx)} Тип ${ctx.summary.digestion.worstBristol} и сниженное самочувствие по замерам. Кишечник, как и весь организм, сегодня в режиме экономии. Попробуй легкую разминку и обильное питье.`
    ]
  },

  // БЛОК 3: УСКОРЕННЫЙ ТРАНЗИТ / ДИАРЕЯ (Бристоль 6, 7)
  diarrhea: {
    general: [
      (ctx: DigestionContext) => `${getGreeting(ctx)} Ускоренный транзит (тип ${ctx.summary.digestion.worstBristol}). Пищеварение раздражено. Пока полностью убери сырые овощи и сделай акцент на рис и печеные корнеплоды.`,
      (ctx: DigestionContext) => `${getGreeting(ctx)} Слишком быстро! Тип ${ctx.summary.digestion.worstBristol} говорит о том, что организм теряет жидкость. Пей воду маленькими глотками и перейди на вареную пищу.`
    ]
  },

  // БЛОК 4: НЕТ ДАННЫХ
  no_data: {
    general: [
      (ctx: DigestionContext) => `${getGreeting(ctx)} Сегодня в дневнике пищеварения пока нет записей. Не забывай фиксировать данные — это основа нашей аналитики!`,
      (ctx: DigestionContext) => `${getGreeting(ctx)} Жду твоих отметок по ЖКТ за сегодня. Регулярность дневника помогает отследить, как продукты влияют на твой организм.`
    ]
  }
};
