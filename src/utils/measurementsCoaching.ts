import { MeasurementContext, getRandomPhrase, MEASUREMENT_PHRASES } from "./measurementsPhrases";
import { DailySummary } from "./crossModuleSummary";
import { parseTriad } from "./triadParser";

export const getMeasurementsFeedback = (
  summary: DailySummary,
  userName?: string,
  userGender?: string
): string => {
  const m = summary.measurements;
  const triad = parseTriad(m.rawTonus);

  const ctx: MeasurementContext = {
    userName,
    userGender: userGender as 'male' | 'female',
    summary,
    pulse: m.latestPulse,
    systolic: m.systolic,
    diastolic: m.diastolic,
    weight: m.weightAvg,
    initialWeight: m.weightDelta !== null && m.weightAvg !== null ? m.weightAvg - m.weightDelta : null,
    weightDelta: m.weightDelta,
    tonusEnergy: triad.energy,
    tonusMood: triad.mood,
    tonusWellbeing: triad.wellbeing,
  };

  let messageParts: string[] = [];
  let isCriticalPulse = false;

  // 1. БЛОК АД (Артериального Давления)
  if (ctx.systolic && ctx.diastolic) {
    const sys = ctx.systolic;
    const dia = ctx.diastolic;
    const pulsePressure = sys - dia;

    // Кризис и Гипертония
    if (sys >= 180 || dia >= 120) {
      messageParts.push(getRandomPhrase('bpHypertensionCrisis', ctx));
      isCriticalPulse = true; // Используем существующий флаг-предохранитель для блокировки тренировок
    } else if (sys >= 140 || dia >= 90) {
      messageParts.push(getRandomPhrase('bpHypertensionStage2', ctx));
      isCriticalPulse = true; // Блокируем активность
    } else if (sys >= 130 || dia >= 85) {
      messageParts.push(getRandomPhrase('bpElevated', ctx));
    } else if (sys >= 90 && dia >= 60) {
      messageParts.push(getRandomPhrase('bpOptimal', ctx));
    } else if (sys < 90 || dia < 60) {
      messageParts.push(getRandomPhrase('bpHypotension', ctx));
      isCriticalPulse = true; // Блокируем активность при сильной слабости
    }

    // Пульсовое давление (добавляем как дополнительное замечание, если нет криза)
    if (sys < 180 && dia < 120) {
      if (pulsePressure > 70) messageParts.push(getRandomPhrase('bpWidePulsePressure', ctx));
      if (pulsePressure < 30) messageParts.push(getRandomPhrase('bpNarrowPulsePressure', ctx));
    }
  }

  // 2. БЛОК ПУЛЬСА
  if (ctx.pulse) {
    if (ctx.pulse >= 100) {
      messageParts.push(getRandomPhrase('pulseTachycardia', ctx));
      isCriticalPulse = true;
    } else if (ctx.pulse > 80 && ctx.pulse < 100) {
      messageParts.push(getRandomPhrase('pulseElevated', ctx));
    } else if (ctx.pulse >= 55 && ctx.pulse <= 80) {
      messageParts.push(getRandomPhrase('pulseOptimal', ctx));
    } else if (ctx.pulse < 55) {
      messageParts.push(getRandomPhrase('pulseBradycardia', ctx));
      isCriticalPulse = true;
    }
  }

  // 3. БЛОК ВЕСА
  if (ctx.weight !== null && ctx.initialWeight !== null && ctx.weightDelta !== null) {
    if (ctx.weightDelta <= -1.5) messageParts.push(getRandomPhrase('weightDropGlycogen', ctx));
    else if (ctx.weightDelta > -1.5 && ctx.weightDelta < -0.2) messageParts.push(getRandomPhrase('weightDropFat', ctx));
    else if (ctx.weightDelta >= 1.5) messageParts.push(getRandomPhrase('weightGainWater', ctx));
    else if (ctx.weightDelta >= -0.2 && ctx.weightDelta < 1.5) messageParts.push(getRandomPhrase('weightPlateau', ctx));
  }

  // 4. БЛОК ТРИАДЫ
  const { energy, mood, wellbeing } = triad;
  const triadKey = `triad_${wellbeing}_${energy}_${mood}` as keyof typeof MEASUREMENT_PHRASES;
  
  if (isCriticalPulse && energy === 'high') {
    messageParts.push("Я вижу, что по ощущениям у тебя много энергии, но твои показатели говорят об обратном. Пожалуйста, не игнорируй цифры и откажись сегодня от тренировок.");
  } else {
    if (MEASUREMENT_PHRASES[triadKey]) {
      messageParts.push(getRandomPhrase(triadKey, ctx));
    } else {
      messageParts.push(getRandomPhrase('triad_normal_normal_normal', ctx));
    }
  }

  return messageParts.filter(Boolean).join('\n\n');
};
