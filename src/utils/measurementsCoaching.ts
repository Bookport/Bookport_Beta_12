import { MeasurementContext, getRandomPhrase, MEASUREMENT_PHRASES } from "./measurementsPhrases";
import { DailySummary } from "./crossModuleSummary";

const parseTriad = (rawTonus: string | null) => {
  let energy = 'normal';
  let mood = 'normal';
  let wellbeing = 'normal';
  let energyLabel = '';
  let moodLabel = '';
  let wellbeingLabel = '';
  
  if (rawTonus) {
    const parts = rawTonus.split('|').map(p => p.trim());
    if (parts.length >= 3) {
      energyLabel = parts[0];
      moodLabel = parts[1];
      wellbeingLabel = parts[2];
      
      if (parts[0] === 'Высокая') energy = 'high';
      else if (parts[0] === 'Сниженная') energy = 'low';
      
      if (parts[1] === 'Лёгкое') mood = 'good';
      else if (parts[1] === 'Тяжёлое') mood = 'bad';
      
      if (parts[2] === 'Хорошее') wellbeing = 'good';
      else if (parts[2] === 'Плохое') wellbeing = 'bad';
    }
  }
  return { energy, mood, wellbeing, energyLabel, moodLabel, wellbeingLabel };
};

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
    weight: m.weightAvg,
    initialWeight: m.weightDelta !== null && m.weightAvg !== null ? m.weightAvg - m.weightDelta : null,
    weightDelta: m.weightDelta,
    tonusEnergy: triad.energy,
    tonusMood: triad.mood,
    tonusWellbeing: triad.wellbeing,
  };

  let messageParts: string[] = [];
  let isCriticalPulse = false;

  // 1. БЛОК ПУЛЬСА
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

  // 2. БЛОК ВЕСА
  if (ctx.weight !== null && ctx.initialWeight !== null && ctx.weightDelta !== null) {
    if (ctx.weightDelta <= -1.5) messageParts.push(getRandomPhrase('weightDropGlycogen', ctx));
    else if (ctx.weightDelta > -1.5 && ctx.weightDelta < -0.2) messageParts.push(getRandomPhrase('weightDropFat', ctx));
    else if (ctx.weightDelta >= 1.5) messageParts.push(getRandomPhrase('weightGainWater', ctx));
    else if (ctx.weightDelta >= -0.2 && ctx.weightDelta < 1.5) messageParts.push(getRandomPhrase('weightPlateau', ctx));
  }

  // 3. БЛОК ТРИАДЫ
  const { energy, mood, wellbeing } = triad;
  
  if (isCriticalPulse) {
    if (energy === 'high') {
      messageParts.push("Я вижу, что по ощущениям у тебя много энергии, но твои показатели пульса говорят об обратном. Пожалуйста, не игнорируй цифры и откажись сегодня от тренировок.");
    }
  } else {
    if (wellbeing === 'good' && energy === 'high' && mood === 'good') {
      messageParts.push(getRandomPhrase('triadFlow', ctx));
    } else if (wellbeing === 'good' && energy === 'high' && mood === 'bad') {
      messageParts.push(getRandomPhrase('triadWiredAndTired', ctx));
    } else if (wellbeing === 'bad' && energy === 'low' && mood === 'good') {
      messageParts.push(getRandomPhrase('triadPhysicalExhaustion', ctx));
    } else if (wellbeing === 'bad' && energy === 'low' && mood === 'bad') {
      messageParts.push(getRandomPhrase('triadApathy', ctx));
    } else if (wellbeing === 'bad' && energy === 'high' && mood === 'bad') {
      messageParts.push(getRandomPhrase('triadSomaticStress', ctx));
    } else if (wellbeing === 'good' && energy === 'low' && mood === 'good') {
      messageParts.push(getRandomPhrase('triadZenRecovery', ctx));
    } else if (wellbeing === 'good' && energy === 'low' && mood === 'bad') {
      messageParts.push(getRandomPhrase('triadStoicGrind', ctx));
    } else if (wellbeing === 'bad' && energy === 'high' && mood === 'good') {
      messageParts.push(getRandomPhrase('triadFragileHigh', ctx));
    } else if (energy === 'low') {
      messageParts.push(getRandomPhrase('tonusLow', ctx));
    }
  }

  return messageParts.join(' ').trim();
};
