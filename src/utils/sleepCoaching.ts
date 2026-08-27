import {
  getRandomSleepPhrase,
  type SleepContext,
  type SleepPhraseCategory,
} from "./annaSleepDictionary";

export type SleepCoachingMood = "good" | "neutral" | "warning";

export interface SleepCoachingResult {
  text: string;
  category: SleepPhraseCategory;
  mood: SleepCoachingMood;
  label: string;
}

const makeResult = (
  category: SleepPhraseCategory,
  mood: SleepCoachingMood,
  label: string,
  context: SleepContext,
): SleepCoachingResult => ({
  text: getRandomSleepPhrase(category, context),
  category,
  mood,
  label,
});

export const getSleepCoaching = (context: SleepContext): SleepCoachingResult => {
  if (!context.hasEntry) {
    return makeResult(
      context.isCurrentDay ? "sleep_NoEntry_Today" : "sleep_NoEntry_History",
      "neutral",
      context.isCurrentDay ? "Готовность к сну" : "Нет записи",
      context,
    );
  }

  const hasQuality = context.quality !== null;
  const isGoodQuality = context.quality === "good";
  const isFairQuality = context.quality === "fair";
  const isPoorQuality = context.quality === "poor";
  const bothUnstable =
    context.bedtimeRegularity === "unstable" &&
    context.wakeRegularity === "unstable";
  const anyUnstable =
    context.bedtimeRegularity === "unstable" ||
    context.wakeRegularity === "unstable";
  const deficit = context.sleepMinutes < context.sleepGoalMinutes;
  const isAboveGoal = context.sleepMinutes >= context.sleepGoalMinutes;
  const isNearGoal =
    context.sleepMinutes >= 360 && context.sleepMinutes < context.sleepGoalMinutes;
  const isModerateDeficit = context.sleepMinutes >= 300 && context.sleepMinutes < 360;
  const isCriticalDeficit = context.sleepMinutes < 300;
  const isLowActivity = (context.activeMinutes ?? 0) < 15;
  const isElevatedPulse = context.pulse !== null && context.pulse > 90;

  if (deficit && isPoorQuality && isLowActivity) {
    return makeResult("crossActivity_Low", "warning", "Мало движения + плохой сон", context);
  }
  if (deficit && isPoorQuality && isElevatedPulse) {
    return makeResult("crossMeasurements_Pulse", "warning", "Пульс + плохой сон", context);
  }
  if (isCriticalDeficit && isLowActivity) {
    return makeResult("crossActivity_Low", "warning", "Критический сон + мало движения", context);
  }
  if (isCriticalDeficit && isElevatedPulse) {
    return makeResult("crossMeasurements_Pulse", "warning", "Критический сон + пульс", context);
  }

  if (isAboveGoal && isFairQuality) {
    return makeResult("combined_AboveGoal_Fair", "neutral", "Длинный сон, среднее самочувствие", context);
  }
  if (isAboveGoal && isPoorQuality) {
    return makeResult("combined_AboveGoal_Poor", "warning", "Длинный сон, плохое самочувствие", context);
  }
  if (context.sleepMinutes >= 450 && isGoodQuality) {
    return makeResult(
      context.isCurrentDay ? "sleep_GoalReached" : "sleep_History_GoalReached",
      "good",
      "Идеальный биоритм",
      context,
    );
  }
  if (context.sleepMinutes >= 450 && isFairQuality) {
    return makeResult("combined_GoalReached_Fair", "neutral", "Цель достигнута, среднее самочувствие", context);
  }
  if (context.sleepMinutes >= 450 && isPoorQuality) {
    return makeResult("combined_GoalReached_Poor", "warning", "Цель достигнута, плохое самочувствие", context);
  }
  if (isNearGoal && isFairQuality) {
    return makeResult("combined_Deficit_Fair", "neutral", "Недобор + среднее самочувствие", context);
  }
  if ((isNearGoal || isModerateDeficit || isCriticalDeficit) && isPoorQuality) {
    return makeResult("combined_Deficit_Poor", "warning", "Недобор + плохое самочувствие", context);
  }

  if (deficit && bothUnstable) {
    return makeResult("schedule_CombinedUnstable", "warning", "Недобор + нестабильный режим", context);
  }
  if (deficit && anyUnstable) {
    return makeResult("combined_Deficit_UnstableSchedule", "warning", "Недобор + плавающий график", context);
  }
  if (isAboveGoal && anyUnstable) {
    return makeResult("combined_AboveGoal_UnstableSchedule", "neutral", "Длинный сон + нестабильный режим", context);
  }

  if (!deficit && context.bedtimeRegularity === "unstable") {
    return makeResult("schedule_BedtimeUnstable", "neutral", "Нестабильный отбой", context);
  }
  if (!deficit && context.wakeRegularity === "unstable") {
    return makeResult("schedule_WakeUnstable", "neutral", "Нестабильный подъём", context);
  }
  if (!deficit && context.bedtimeRegularity === "stable") {
    return makeResult("schedule_BedtimeStable", "good", "Стабильный отбой", context);
  }
  if (!deficit && context.wakeRegularity === "stable") {
    return makeResult("schedule_WakeStable", "good", "Стабильный подъём", context);
  }

  if (hasQuality && isGoodQuality) {
    return makeResult("quality_Good", "good", "Хорошее самочувствие", context);
  }
  if (hasQuality && isFairQuality) {
    return makeResult(
      context.isCurrentDay ? "quality_Fair" : "quality_Fair_History",
      "neutral",
      "Среднее самочувствие",
      context,
    );
  }
  if (hasQuality && isPoorQuality) {
    return makeResult(
      context.isCurrentDay ? "quality_Poor" : "quality_Poor_History",
      "warning",
      "Плохое самочувствие",
      context,
    );
  }

  if (!hasQuality) {
    return makeResult(
      context.isCurrentDay ? "data_MissingQuality" : "data_MissingQuality_History",
      "neutral",
      "Нет оценки самочувствия",
      context,
    );
  }

  if (isAboveGoal) {
    return makeResult(
      context.isCurrentDay ? "sleep_AboveGoal" : "sleep_History_AboveGoal",
      "good",
      "Хороший отдых",
      context,
    );
  }
  if (isNearGoal) {
    return makeResult("sleep_Deficit_NearGoal", "neutral", "Ограниченное время", context);
  }
  if (isModerateDeficit) {
    return makeResult("sleep_Deficit_Moderate", "warning", "Кислородное голодание", context);
  }
  return makeResult("sleep_Deficit_Critical", "warning", "Кислородное голодание", context);
};
