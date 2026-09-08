export const ANNA_TOPIC_KEYS = [
  "water",
  "sleep",
  "movement",
  "measurements",
  "digestion",
  "nutrition",
  "meals",
  "wellbeing",
  "support",
  "navigation",
  "book",
] as const;

export type AnnaTopicKey = (typeof ANNA_TOPIC_KEYS)[number];

export type AnnaTopicMatch = {
  key: AnnaTopicKey;
  priority: number;
};

export interface DailyMetrics {
  date: string;
  dayIndex?: number;
  waterMl?: number;
  sleepMinutes?: number;
  mealCount?: number;
  habitsDone?: number;
  activityMinutes?: number;
  steps?: number;
  waterEntries?: any[];
  sleepLogs?: any[];
  digestionLog?: any[];
  movementLog?: any[];
  measurements?: any[];
  pulse?: number | null;
  weight?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  tonus?: string | null;
  dayMood?: string | null;
  dayBookmark?: string | null;
};

export type AnnaRouteDecision = {
  topics: AnnaTopicKey[];
  needsMedicalSafety: boolean;
  needsPreviousDayMeals: boolean;
  needsProfile: boolean;
  knowledgeFiles: string[];
  needsDiary: boolean;
  moduleFiles: string[];
};

export type AnnaMinimalProfile = {
  name?: string;
  gender?: "female" | "male";
  timeZone: string;
  currentDayIndex?: number;
  goals?: string[];
  chronicConditions?: string[];
};

export type AnnaWaterSnapshot = {
  status: "available" | "no_data";
  localDate: string;
  consumedMl?: number;
  targetMl?: number;
  remainingMl?: number;
  lastEntryTime?: string;
};

export type AnnaSleepSnapshot = {
  status: "available" | "no_data";
  localDate: string;
  totalMinutes?: number;
  startTime?: string;
  endTime?: string;
  quality?: string | number;
  awakenings?: number;
  note?: string;
};

export type AnnaMovementSession = {
  time?: string;
  type?: string;
  minutes?: number;
};

export type AnnaMovementSnapshot = {
  status: "available" | "no_data";
  localDate: string;
  activityMinutes?: number;
  targetMinutes?: number;
  steps?: number;
  sessions?: AnnaMovementSession[];
};

export type AnnaMeasurementValues = {
  localDate: string;
  weight?: number;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  tonus?: string;
};

export type AnnaMeasurementsSnapshot = {
  status: "available" | "no_data";
  latest?: AnnaMeasurementValues;
  previous?: AnnaMeasurementValues;
  delta?: {
    weight?: number;
    systolic?: number;
    diastolic?: number;
    pulse?: number;
  };
};

export type AnnaDigestionEvent = {
  localDate: string;
  time?: string;
  comfort?: string;
  symptoms?: string[];
  bristolType?: number;
  note?: string;
  linkedMeal?: string;
};

export type AnnaDigestionSnapshot = {
  status: "available" | "no_data";
  latest?: AnnaDigestionEvent;
  recent?: AnnaDigestionEvent[];
};

export type AnnaPreviousDayMeal = {
  time: string;
  name: string;
  ingredients?: string;
};

export type AnnaPreviousDayMealsSnapshot = {
  status: "available" | "no_data";
  localDate: string;
  meals: AnnaPreviousDayMeal[];
};

export type AnnaReflectionSnapshot = {
  diary?: Array<{
    localDate: string;
    time?: string;
    mood?: string;
    note?: string;
  }>;
  eveningRitual?: {
    localDate: string;
    body?: string;
    psychology?: string;
    insight?: string;
  };
};

export type AnnaContextSnapshot = {
  profile?: AnnaMinimalProfile;
  water?: AnnaWaterSnapshot;
  sleep?: AnnaSleepSnapshot;
  movement?: AnnaMovementSnapshot;
  measurements?: AnnaMeasurementsSnapshot;
  digestion?: AnnaDigestionSnapshot;
  previousDayMeals?: AnnaPreviousDayMealsSnapshot;
  reflection?: AnnaReflectionSnapshot;
};
