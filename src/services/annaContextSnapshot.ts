/**
 * annaContextSnapshot.ts
 *
 * Builds a factual, timezone-aware snapshot of the user's daily metrics
 * for a given local date. This is the primary data-preparation layer
 * before routing to Anna's context-aware responses.
 *
 * Principles:
 * - No hallucination: only fields actually present in DailyMetrics are used.
 * - Timezone correctness: all day boundaries are computed via getLocalDayBounds.
 * - Defensive parsing: missing or malformed arrays are treated as empty.
 * - Transparent limits: counts and sums are capped where appropriate.
 */

import type { DailyMetrics, AnnaContextSnapshot, AnnaMeasurementValues, AnnaDigestionEvent } from "./annaContextTypes";
import { getLocalDayBounds } from "./annaContextDates";

/**
 * Movement log entry shape as created in MyDayScreen.tsx.
 */
interface MovementEntry {
  id: string;
  dayIndex: number;
  type: string;
  activityType: string;
  duration: number;
  durationSeconds: number;
  timestamp: number;
  timeString: string;
}

/**
 * Measurement log entry shape as created in MyDayScreen.tsx.
 */
interface MeasurementEntry {
  id: string;
  dayIndex: number;
  timestamp: number;
  timeString: string;
  energy: string;
  mood: string;
  wellbeing: string;
  tonus: string;
  pulse: number | null;
  weight: number | null;
  systolic: number | null;
  diastolic: number | null;
}

/**
 * Sleep log entry shape as created in MyDayScreen.tsx.
 */
interface SleepEntry {
  id: string;
  dayIndex: number;
  sleepDate: string;
  bedtime: string;
  sleepTime: string;
  wakeTime: string;
  duration: number;
  quality: string | null;
  source: "quick" | "manual";
  status: "completed" | "planned";
  timezone: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Water log entry shape as created in MyDayScreen.tsx.
 */
interface WaterEntry {
  id: string;
  amount: number;
  time: string;
  timestamp: number;
}

/**
 * Digestion log entry shape as created in DigestionModal.tsx.
 */
interface DigestionEntry {
  id: string;
  dayIndex: number;
  timestamp: number;
  timeString: string;
  type: "gas" | "bloating" | "cramps" | "nausea" | "heartburn" | "other";
  severity: 1 | 2 | 3;
  note?: string;
}

/**
 * Builds an AnnaContextSnapshot from raw DailyMetrics for a given timezone.
 *
 * @param metrics - Daily metrics payload from /api/metrics/daily or similar.
 * @param timeZone - IANA time zone string, e.g. "Europe/Moscow".
 * @param referenceDate - Optional ISO date "YYYY-MM-DD". If omitted, uses metrics.date.
 */
export function buildAnnaContextSnapshot(
  metrics: DailyMetrics,
  timeZone: string,
  referenceDate?: string
): AnnaContextSnapshot {
  const dateStr = referenceDate ?? metrics.date;
  if (!dateStr) {
    throw new Error("buildAnnaContextSnapshot: no date available");
  }

  const { startMs, endMs } = getLocalDayBounds(dateStr, timeZone);

  // Defensive array normalization
  const movementLog = Array.isArray(metrics.movementLog) ? metrics.movementLog : [];
  const measurements = Array.isArray(metrics.measurements) ? metrics.measurements : [];
  const sleepLogs = Array.isArray(metrics.sleepLogs) ? metrics.sleepLogs : [];
  const waterEntries = Array.isArray(metrics.waterEntries) ? metrics.waterEntries : [];
  const digestionLog = Array.isArray(metrics.digestionLog) ? metrics.digestionLog : [];

  // Filter by local day boundaries using entry timestamp
  const movementToday = movementLog.filter((e: MovementEntry) =>
    e.timestamp >= startMs && e.timestamp < endMs
  );
  const measurementsToday = measurements.filter((e: MeasurementEntry) =>
    e.timestamp >= startMs && e.timestamp < endMs
  );
  const sleepToday = sleepLogs.filter((e: SleepEntry) => {
    // Sleep entries use createdAt for filtering consistency
    const ts = (e as any).createdAt ?? 0;
    return ts >= startMs && ts < endMs;
  });
  const waterToday = waterEntries.filter((e: WaterEntry) =>
    e.timestamp >= startMs && e.timestamp < endMs
  );
  const digestionToday = digestionLog.filter((e: DigestionEntry) =>
    e.timestamp >= startMs && e.timestamp < endMs
  );

  // Aggregations
  const activityMinutes = movementToday.reduce(
    (sum: number, e: MovementEntry) => sum + (e.durationSeconds ?? 0) / 60,
    0
  );

  const consumedMl = waterToday.reduce(
    (sum: number, e: WaterEntry) => sum + (e.amount ?? 0),
    0
  );

  const totalSleepMinutes = sleepToday.reduce(
    (sum: number, e: SleepEntry) => sum + (e.duration ?? 0),
    0
  );

  // Last measurement (by timestamp)
  let lastMeasurement: MeasurementEntry | null = null;
  if (measurementsToday.length > 0) {
    lastMeasurement = measurementsToday.reduce((prev, curr) =>
      (curr.timestamp ?? 0) > (prev.timestamp ?? 0) ? curr : prev
    );
  }

  // Last digestion event
  let lastDigestion: DigestionEntry | null = null;
  if (digestionToday.length > 0) {
    lastDigestion = digestionToday.reduce((prev, curr) =>
      (curr.timestamp ?? 0) > (prev.timestamp ?? 0) ? curr : prev
    );
  }

  // Last sleep entry for startTime/endTime
  let lastSleep: SleepEntry | null = null;
  if (sleepToday.length > 0) {
    lastSleep = sleepToday.reduce((prev, curr) =>
      (curr.createdAt ?? 0) > (prev.createdAt ?? 0) ? curr : prev
    );
  }

  // Last water entry time
  let lastWaterTime: string | undefined;
  if (waterToday.length > 0) {
    const lastWater = waterToday.reduce((prev, curr) =>
      (curr.timestamp ?? 0) > (prev.timestamp ?? 0) ? curr : prev
    );
    lastWaterTime = lastWater.time;
  }

  // Movement sessions
  const sessions = movementToday.map((e: MovementEntry) => ({
    time: e.timeString,
    type: e.type,
    minutes: Math.round(e.durationSeconds / 60),
  }));

  const snapshot: AnnaContextSnapshot = {
    profile: {
      timeZone,
    },
    water: {
      status: waterToday.length > 0 ? "available" : "no_data",
      localDate: dateStr,
      consumedMl: Math.round(consumedMl),
      lastEntryTime: lastWaterTime,
    },
    sleep: {
      status: sleepToday.length > 0 ? "available" : "no_data",
      localDate: dateStr,
      totalMinutes: Math.round(totalSleepMinutes),
      startTime: lastSleep?.sleepTime,
      endTime: lastSleep?.wakeTime,
      quality: lastSleep?.quality ?? undefined,
    },
    movement: {
      status: movementToday.length > 0 ? "available" : "no_data",
      localDate: dateStr,
      activityMinutes: Math.round(activityMinutes),
      sessions: sessions.length > 0 ? sessions : undefined,
    },
    measurements: {
      status: measurementsToday.length > 0 ? "available" : "no_data",
      latest: lastMeasurement
        ? {
            localDate: dateStr,
            weight: lastMeasurement.weight ?? undefined,
            systolic: lastMeasurement.systolic ?? undefined,
            diastolic: lastMeasurement.diastolic ?? undefined,
            pulse: lastMeasurement.pulse ?? undefined,
            tonus: lastMeasurement.tonus,
          }
        : undefined,
    },
    digestion: {
      status: digestionToday.length > 0 ? "available" : "no_data",
      latest: lastDigestion
        ? {
            localDate: dateStr,
            time: lastDigestion.timeString,
            comfort: String(lastDigestion.severity),
            symptoms: [lastDigestion.type],
            note: lastDigestion.note,
          }
        : undefined,
    },
  };

  return snapshot;
}

/**
 * Optional helper: merge multiple DailyMetrics days into an array of snapshots.
 */
export function buildAnnaContextSnapshots(
  metricsList: DailyMetrics[],
  timeZone: string
): AnnaContextSnapshot[] {
  return metricsList.map((m) => buildAnnaContextSnapshot(m, timeZone));
}
