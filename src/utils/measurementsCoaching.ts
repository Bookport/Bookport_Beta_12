import { MeasurementContext, getRandomPhrase, MEASUREMENT_PHRASES } from "./measurementsPhrases";
import { DailySummary } from "./crossModuleSummary";
import { parseTriad } from "./triadParser";

const BP_CRISIS_SYSTOLIC = 180;
const BP_CRISIS_DIASTOLIC = 120;
const BP_STAGE_2_SYSTOLIC = 140;
const BP_STAGE_2_DIASTOLIC = 90;
const BP_STAGE_1_SYSTOLIC = 130;
const BP_STAGE_1_DIASTOLIC = 80;
const BP_HYPOTENSION_SYSTOLIC = 90;
const BP_HYPOTENSION_DIASTOLIC = 60;
const PULSE_TACHYCARDIA = 100;
const PULSE_BRADYCARDIA = 55;
const PULSE_ELEVATED = 80;
const PULSE_PRESSURE_WIDE = 70;
const PULSE_PRESSURE_NARROW = 30;
const WEIGHT_DROP_RAPID = -1.5;
const WEIGHT_DROP_NOTICEABLE = -0.2;
const WEIGHT_GAIN_RAPID = 1.5;

type PhraseCategory = keyof typeof MEASUREMENT_PHRASES;

const hasPhraseCategory = (key: string): key is PhraseCategory =>
  Object.prototype.hasOwnProperty.call(MEASUREMENT_PHRASES, key);

const getBpCategory = (sys: number | null, dia: number | null): PhraseCategory | null => {
  if (sys === null || dia === null) return null;
  if (sys >= BP_CRISIS_SYSTOLIC || dia >= BP_CRISIS_DIASTOLIC) return "bpHypertensionCrisis";
  if (sys < BP_HYPOTENSION_SYSTOLIC || dia < BP_HYPOTENSION_DIASTOLIC) return "bpHypotension";
  if (sys >= BP_STAGE_2_SYSTOLIC || dia >= BP_STAGE_2_DIASTOLIC) return "bpHypertensionStage2";
  if (sys >= BP_STAGE_1_SYSTOLIC || dia >= BP_STAGE_1_DIASTOLIC) return "bpElevated";
  const pulsePressure = sys - dia;
  if (pulsePressure > PULSE_PRESSURE_WIDE) return "bpWidePulsePressure";
  if (pulsePressure < PULSE_PRESSURE_NARROW) return "bpNarrowPulsePressure";
  return null;
};

const getPulseCategory = (pulse: number | null): PhraseCategory | null => {
  if (pulse === null) return null;
  if (pulse >= PULSE_TACHYCARDIA) return "pulseTachycardia";
  if (pulse < PULSE_BRADYCARDIA) return "pulseBradycardia";
  if (pulse > PULSE_ELEVATED) return "pulseElevated";
  return null;
};

const getWeightCategory = (ctx: MeasurementContext): PhraseCategory | null => {
  if (ctx.weight === null || ctx.initialWeight === null || ctx.weightDelta === null) return null;
  if (ctx.weightDelta <= WEIGHT_DROP_RAPID) return "weightDropGlycogen";
  if (ctx.weightDelta < WEIGHT_DROP_NOTICEABLE) return "weightDropFat";
  if (ctx.weightDelta >= WEIGHT_GAIN_RAPID) return "weightGainWater";
  return null;
};

const hasAdversePulse = (pulse: number | null): boolean =>
  pulse !== null && (pulse >= PULSE_TACHYCARDIA || pulse < PULSE_BRADYCARDIA);

const hasAdversePressure = (sys: number | null, dia: number | null): boolean =>
  sys !== null && dia !== null &&
  (sys >= BP_STAGE_2_SYSTOLIC || dia >= BP_STAGE_2_DIASTOLIC ||
    sys < BP_HYPOTENSION_SYSTOLIC || dia < BP_HYPOTENSION_DIASTOLIC);

export const getMeasurementsFeedback = (
  summary: DailySummary,
  userName?: string,
  userGender?: string
): string => {
  const m = summary.measurements;
  const triad = parseTriad(m.rawTonus);
  const ctx: MeasurementContext = {
    userName,
    userGender: userGender as "male" | "female",
    summary,
    pulse: m.latestPulse,
    systolic: m.systolic,
    diastolic: m.diastolic,
    weight: m.weightAvg,
    initialWeight: m.weightDelta !== null && m.weightAvg !== null
      ? m.weightAvg - m.weightDelta : null,
    weightDelta: m.weightDelta,
    tonusEnergy: triad.energy,
    tonusMood: triad.mood,
    tonusWellbeing: triad.wellbeing,
  };

  const bp = getBpCategory(ctx.systolic, ctx.diastolic);
  const pulse = getPulseCategory(ctx.pulse);
  const weight = getWeightCategory(ctx);
  const emergency = bp === "bpHypertensionCrisis";
  const critical = emergency || hasAdversePressure(ctx.systolic, ctx.diastolic) || hasAdversePulse(ctx.pulse);
  const completeBp = ctx.systolic !== null && ctx.diastolic !== null;
  const bpValue = completeBp ? `${ctx.systolic}/${ctx.diastolic}` : "";

  // Пока словарь переписывается, клинически значимые пересечения формулируются
  // здесь целиком. Это не допускает случайного вывода старой фразы в опасной ветке.
  if (emergency) {
    const rhythm = hasAdversePulse(ctx.pulse)
      ? ` Пульс ${ctx.pulse} уд/мин — дополнительный значимый сигнал.` : "";
    return `АД ${bpValue} мм рт. ст. — очень высокое значение.${rhythm} Если есть боль в груди, одышка, внезапная слабость или онемение, нарушение речи или зрения, спутанность — немедленно вызывай экстренную помощь. Если этих симптомов нет, посиди спокойно 5 минут, повтори измерение и при сохранении значения срочно свяжись с медицинским специалистом. Не пытайся снижать давление едой или чужими лекарствами.`;
  }

  if (bp === "bpHypotension" && pulse === "pulseTachycardia") {
    return `АД ${bpValue} мм рт. ст. и пульс ${ctx.pulse} уд/мин в покое: низкое давление сочетается с учащённым пульсом. Это сочетание требует оценки причины сегодня, особенно если есть слабость или головокружение. Сядь или приляг, не тренируйся, повтори оба измерения после отдыха. При обмороке, спутанности, боли в груди, одышке или нарастающей слабости вызывай экстренную помощь. Не используй соль или добавки как самолечение.`;
  }

  if (bp === "bpHypotension" && pulse === "pulseBradycardia") {
    return `АД ${bpValue} мм рт. ст. и пульс ${ctx.pulse} уд/мин: оба показателя снижены. Сядь или приляг, повтори замеры и отметь самочувствие. При предобмороке, обмороке, спутанности, боли в груди или одышке вызывай экстренную помощь; если комбинация новая либо повторяется, нужна очная оценка. Не пытайся исправить цифры солью, кофеином или добавками.`;
  }

  if (bp === "bpHypertensionStage2" && hasAdversePulse(ctx.pulse)) {
    return `АД ${bpValue} мм рт. ст., пульс ${ctx.pulse} уд/мин: давление высокое, ЧСС также вне обычного диапазона покоя. Отложи интенсивную нагрузку, посиди 5 минут и повтори измерения. Если эта комбинация сохраняется, свяжись с врачом сегодня; при боли в груди, одышке, обмороке или внезапных неврологических симптомах вызывай экстренную помощь. Не меняй назначенные препараты самостоятельно.`;
  }

  if (bp === "bpElevated" && pulse === "pulseTachycardia") {
    return `АД ${bpValue} мм рт. ст. и пульс ${ctx.pulse} уд/мин: давление в повышенном диапазоне, а ЧСС в покое уже ускорена. Сейчас приоритет — пульс, а не тренировочный план. После 5–10 минут отдыха повтори оба замера; отметь недавнюю нагрузку, температуру, кофеин и лекарства. Если учащение сохраняется, обратись к врачу; при боли в груди, одышке, обмороке или сильном головокружении — за экстренной помощью.`;
  }

  if (bp === "bpElevated" && pulse === "pulseBradycardia") {
    return `АД ${bpValue} мм рт. ст., пульс ${ctx.pulse} уд/мин: давление выше желаемого диапазона, а ЧСС ниже среднего. Не объясняй эту комбинацию питанием. Перемерь после отдыха и сравни пульс со своей обычной базой. Если появились слабость, головокружение, предобморок или одышка — обратись за срочной медицинской оценкой.`;
  }

  // Устойчивый неэкстренный сценарий: давление стадии 1, спокойный пульс
  // и высокий ресурс. Формируем полный экспертный вывод целиком, не отдавая
  // главный вердикт случайной фразе из словаря.
  if (
    bp === "bpElevated" &&
    ctx.pulse !== null &&
    ctx.pulse >= PULSE_BRADYCARDIA &&
    ctx.pulse <= PULSE_ELEVATED &&
    triad.wellbeing === "good" &&
    triad.energy === "high" &&
    triad.mood === "good"
  ) {
    const activeMin = Math.max(0, summary.movement.activeMin);
    const movementPlan = activeMin >= 30
      ? `За сегодня уже ${activeMin} мин движения: цель Системы 30 минут выполнена, поэтому дополнительная прогулка для коррекции АД не нужна.`
      : `За сегодня ${activeMin} мин движения; до цели Системы осталось ${30 - activeMin} мин. Добирай их только привычной умеренной прогулкой и только после вечерней контрольной серии АД.`;

    return `АД ${bpValue} мм рт. ст., пульс ${ctx.pulse} уд/мин. Пульс спокойный; рабочий сигнал сегодня — давление в диапазоне стадии 1 по классификации показателя. Это не экстренная ситуация и не диагноз по одному замеру. ${movementPlan}

Пищевой фокус Системы: проверь готовый хлеб, соусы, консервы и растительные полуфабрикаты на добавленную соль и масло. Следующий приём пищи собери из бобовых или тофу, цельного зерна, овощей и зелени — без добавленной соли, масла и продуктов животного происхождения. Вечером посиди 5 минут в покое, затем сделай два замера с интервалом 1 минуту и запиши оба. Если средние домашние значения в диапазоне 130–139/80–89 повторяются, собери 7-дневный утренне-вечерний журнал для врача.`;
  }

  const physiologyCategory = bp ?? pulse ?? weight ??
    (completeBp ? "bpOptimal" : ctx.pulse !== null ? "pulseOptimal" :
      ctx.weight !== null && ctx.weightDelta !== null ? "weightPlateau" : null);

  if (physiologyCategory === null && m.rawTonus === null) return "";

  const physiologyPhrase = physiologyCategory
    ? getRandomPhrase(physiologyCategory, ctx) : "";

  if (critical) {
    const pulseDetail = hasAdversePulse(ctx.pulse) && bp !== null
      ? ` Пульс ${ctx.pulse} уд/мин также требует внимания.` : "";
    const prompt = bp === "bpHypotension"
      ? "При головокружении или слабости не вставай резко; если эпизод повторяется, обсуди его с врачом."
      : "Не форсируй нагрузку; повтори измерение после отдыха и запиши результат.";
    return [physiologyPhrase, `${pulseDetail.trim()} ${prompt}`.trim()].filter(Boolean).join("\n\n");
  }

  const triadKey = `triad_${triad.wellbeing}_${triad.energy}_${triad.mood}`;
  let triadPhrase = "";

  // Исправляем именно проверенный пользователем сценарий, не выдавая
  // усреднённую фразу о настроении вместо плана для 137/81 и ЧСС 68.
  if (bp === "bpElevated" && ctx.pulse !== null && ctx.pulse >= 55 && ctx.pulse <= 80 &&
      triad.wellbeing === "good" && triad.energy === "high" && triad.mood === "good") {
    const activity = summary.movement.activeMin;
    const activityStep = activity >= 30
      ? `Норма движения 30 минут уже выполнена (${activity} мин); дополнительная прогулка для коррекции АД не нужна.`
      : `Сегодня до цели движения 30 минут осталось ${30 - activity} мин; добирай их только привычной умеренной прогулкой после контрольного замера и при хорошем самочувствии.`;
    triadPhrase = `Пульс ${ctx.pulse} уд/мин и высокий субъективный ресурс позволяют работать с привычками, не игнорируя АД. ${activityStep} Следующий приём пищи по Системе: бобовые или тофу, цельное зерно и овощи с зеленью — без соли, масла и животных продуктов. Вечером повтори АД: 5 минут покоя, затем два замера с интервалом 1 минуту.`;
  } else if (hasPhraseCategory(triadKey)) {
    triadPhrase = getRandomPhrase(triadKey, ctx);
  } else {
    triadPhrase = getRandomPhrase("triad_normal_normal_normal", ctx);
  }

  return [physiologyPhrase, triadPhrase].filter(Boolean).join("\n\n");
};
