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
    userGender: userGender as "male" | "female",
    summary,
    pulse: m.latestPulse,
    systolic: m.systolic,
    diastolic: m.diastolic,
    weight: m.weightAvg,
    initialWeight:
      m.weightDelta !== null && m.weightAvg !== null
        ? m.weightAvg - m.weightDelta
        : null,
    weightDelta: m.weightDelta,
    tonusEnergy: triad.energy,
    tonusMood: triad.mood,
    tonusWellbeing: triad.wellbeing,
  };

  let physiologyPhrase = "";
  let isCriticalIndicator = false;

  const sys = ctx.systolic;
  const dia = ctx.diastolic;
  const pulse = ctx.pulse;
  const pulsePressure =
    sys !== null && dia !== null ? sys - dia : null;

  // Одна физиологическая фраза: риск/отклонение АД → пульс → вес → нейтральный показатель.
  if (sys !== null && dia !== null) {
    if (sys >= 180 || dia >= 120) {
      physiologyPhrase = getRandomPhrase("bpHypertensionCrisis", ctx);
      isCriticalIndicator = true;
    } else if (sys >= 140 || dia >= 90) {
      physiologyPhrase = getRandomPhrase("bpHypertensionStage2", ctx);
      isCriticalIndicator = true;
    } else if (sys < 90 || dia < 60) {
      physiologyPhrase = getRandomPhrase("bpHypotension", ctx);
      isCriticalIndicator = true;
    } else if (pulsePressure !== null && pulsePressure > 70) {
      physiologyPhrase = getRandomPhrase("bpWidePulsePressure", ctx);
    } else if (pulsePressure !== null && pulsePressure < 30) {
      physiologyPhrase = getRandomPhrase("bpNarrowPulsePressure", ctx);
    } else if (sys >= 130 || dia >= 85) {
      physiologyPhrase = getRandomPhrase("bpElevated", ctx);
    }
  }

  if (!physiologyPhrase && pulse !== null) {
    if (pulse >= 100) {
      physiologyPhrase = getRandomPhrase("pulseTachycardia", ctx);
      isCriticalIndicator = true;
    } else if (pulse < 55) {
      physiologyPhrase = getRandomPhrase("pulseBradycardia", ctx);
      isCriticalIndicator = true;
    } else if (pulse > 80) {
      physiologyPhrase = getRandomPhrase("pulseElevated", ctx);
    }
  }

  if (
    !physiologyPhrase &&
    ctx.weight !== null &&
    ctx.initialWeight !== null &&
    ctx.weightDelta !== null
  ) {
    if (ctx.weightDelta <= -1.5) {
      physiologyPhrase = getRandomPhrase("weightDropGlycogen", ctx);
    } else if (ctx.weightDelta < -0.2) {
      physiologyPhrase = getRandomPhrase("weightDropFat", ctx);
    } else if (ctx.weightDelta >= 1.5) {
      physiologyPhrase = getRandomPhrase("weightGainWater", ctx);
    }
  }

  // При спокойных показателях — одна нейтральная опорная фраза.
  if (!physiologyPhrase) {
    if (sys !== null && dia !== null) {
      physiologyPhrase = getRandomPhrase("bpOptimal", ctx);
    } else if (pulse !== null) {
      physiologyPhrase = getRandomPhrase("pulseOptimal", ctx);
    } else if (ctx.weight !== null && ctx.weightDelta !== null) {
      physiologyPhrase = getRandomPhrase("weightPlateau", ctx);
    }
  }

  const { energy, mood, wellbeing } = triad;
  const triadKey =
    `triad_${wellbeing}_${energy}_${mood}` as keyof typeof MEASUREMENT_PHRASES;

  let triadPhrase = "";

  if (isCriticalIndicator && energy === "high") {
    triadPhrase =
      "По ощущениям энергии много, но текущие показатели требуют бережного режима. Отложи интенсивную нагрузку, спокойно повтори измерения и ориентируйся на самочувствие.";
  } else if (MEASUREMENT_PHRASES[triadKey]) {
    triadPhrase = getRandomPhrase(triadKey, ctx);
  } else {
    triadPhrase = getRandomPhrase("triad_normal_normal_normal", ctx);
  }

  return [physiologyPhrase, triadPhrase].filter(Boolean).join("\n\n");
};
