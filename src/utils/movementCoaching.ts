export interface MovementCoachingParams {
  userName: string;
  userGender: "female" | "male";
  todayTotalMin: number;
  dailyTargetMin: number;
  streak: number;
  latestActivityType: string | null;
}

interface CoachingResult {
  status: string;
  label: string;
  glowBorderClass: string;
  statusBadge: string;
  text: string;
}

export function getAnnaMovementCoaching(params: MovementCoachingParams): CoachingResult {
  const { userName, userGender, todayTotalMin, dailyTargetMin, streak, latestActivityType } = params;
  const genderEnd = userGender === "male" ? "" : "а";

  const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  if (todayTotalMin >= 60) {
    return {
      status: "overactive",
      label: "Сверхактивность!",
      glowBorderClass: "border-[#F97316] shadow-[#FDBA74]/75 shadow-md",
      statusBadge: "bg-[#FFEDD5] text-[#C2410C]",
      text: rand([
        `Невероятно, ${userName}! Больше часа в движении — это феноменальная выносливость. В системе WFPB мы бережём сосуды и сердце, поэтому помни: качественный отдых так же важен, как и тренировка. Дай телу восстановиться! 🌟`,
        `Ого, ${userName}! Твоей энергии сегодня можно позавидовать. Ты много двигал${genderEnd}сь, а значит, лимфоток сейчас в идеальном состоянии. Обязательно восполни гидробаланс и хорошо отдохни. 💧`,
        `Отличная работа, ${userName}! Более 60 минут активности — это серьезно. Не забывай, что главное в нашем подходе — это долгосрочная регулярность, а не разовые рекорды. Поблагодари себя за труд и позволь себе расслабление. 🧘`
      ])
    };
  }

  if (todayTotalMin >= dailyTargetMin) {
    return {
      status: "excellent",
      label: "Цель достигнута!",
      glowBorderClass: "border-[#10B981] shadow-[#A7F3D0]/75 shadow-md",
      statusBadge: "bg-[#D1FAE5] text-[#065F46]",
      text: rand([
        `Потрясающий день, ${userName}! Ты сегодня двигаешь${userGender === "male" ? "ся" : "ся"} просто образцово. Твои ${todayTotalMin} минут активности — это мощный вклад в здоровый вес и поддержку сосудов. Так держать! 🔥`,
        `Норма выполнена, ${userName}! ${todayTotalMin} минут движения — это твоя личная победа сегодня. Благодаря отсутствию лишней соли, твое сердце работает легко и свободно. Отличная дисциплина! 🌿`,
        `Браво, ${userName}! Дневная цель по активности закрыта. ${todayTotalMin} минут пролетели не зря. Горжусь твоей стабильностью, это лучший подарок для твоего долголетия. ✨`
      ])
    };
  }

  if (todayTotalMin === 0) {
    if (streak > 1) {
      return {
        status: "reminder",
        label: "Прорыв ритма?",
        glowBorderClass: "border-[#FACC15] shadow-[#FEF08A]/75 shadow-md",
        statusBadge: "bg-[#FEF08A] text-[#854D0E]",
        text: rand([
          `Привет, ${userName}! Твоя серия из ${streak} активных дней на паузе. WFPB и движение — неразделимы. Давай сделаем 10-15 минут лёгкой растяжки, чтобы не терять набранный ритм? 🌿`,
          `Эй, ${userName}! Вчера ты отлично справлял${genderEnd}сь, а сегодня организм просит небольшого заряда бодрости. Даже легкая прогулка поможет разогнать кровь. Попробуем? 🚶‍♀️`,
          `${userName}, твоя впечатляющая серия в ${streak} дней заслуживает продолжения. Тело уже привыкло к хорошему, давай подарим ему немного движения, чтобы поддержать сосуды в тонусе! 🌟`
        ])
      };
    }
    return {
      status: "motivate",
      label: "Готовы начать?",
      glowBorderClass: "border-[#94A3B8] shadow-slate-150/50 shadow-md",
      statusBadge: "bg-slate-100 text-slate-700",
      text: rand([
        `Привет, ${userName}! Сегодня твоё тело ещё не почувствовало радость движения. Движение — это главный транспорт нутриентов к клеткам. Выбирай комфортную активность и жми «Старт»! ☀️`,
        `${userName}, пора размяться! Даже 15 минут спокойной ходьбы творят чудеса с лимфотоком и доставляют питательные вещества. Не гонись за рекордами, просто начни. 🌱`,
        `Здравствуй, ${userName}! На чистом растительном питании энергия накапливается легко, но её нужно запускать в работу. Предлагаю короткую разминку, чтобы взбодриться! 🚀`
      ])
    };
  }

  let activityContext = "";
  if (latestActivityType) {
    const act = latestActivityType.toLowerCase();
    if (act.includes("йога") || act.includes("растяжка") || act.includes("мобилити")) {
      activityContext = " Гибкость и баланс, которые дает эта тренировка, прекрасно дополняют легкость WFPB-рациона.";
    } else if (act.includes("кардио") || act.includes("велосипед") || act.includes("танцы") || act.includes("прогулка")) {
      activityContext = " Твое сердце сейчас отлично качает кровь, а лимфоток работает как часы.";
    } else if (act.includes("силов") || act.includes("зарядка")) {
      activityContext = " Приятный тонус мышц после нагрузки — верный признак, что нутриенты пошли точно в цель.";
    }
  }

  return {
    status: "progressing",
    label: "Отличный темп!",
    glowBorderClass: "border-[#A78BFA] shadow-[#DDD6FE]/75 shadow-md",
    statusBadge: "bg-[#EDE9FE] text-[#6D28D9]",
    text: rand([
      `Чудесное начало, ${userName}! Ты уже набрал${genderEnd} ${todayTotalMin} минут движения сегодня.${activityContext} Осталось совсем немного до нормы в ${dailyTargetMin} мин. 🌸`,
      `Процесс пошел, ${userName}! Первые ${todayTotalMin} минут в копилке.${activityContext} Сохраняй темп, и норма в ${dailyTargetMin} минут будет взята без труда. ✨`,
      `Хороший разогрев, ${userName}! На счету ${todayTotalMin} минут.${activityContext} Вечером можно добавить спокойную прогулку, чтобы окончательно закрыть дневную цель! 🌿`
    ])
  };
}
