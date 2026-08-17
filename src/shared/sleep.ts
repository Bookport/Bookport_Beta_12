// Canonical sleep contract shared between client and server.
// SleepEntry is the single source of truth for daily sleep; DailyMetric.sleepLogs
// stores the serialized journal of entries. Legacy rows (sleepMinutes > 0 with an
// empty journal) are surfaced as source: "legacy" entries.

export type SleepQuality = "good" | "fair" | "poor" | null;
export type SleepSource = "quick" | "manual" | "anna-prompt" | "legacy";
export type SleepStatus = "completed" | "draft";

export interface SleepEntry {
  id: string;
  dayIndex: number; // 1..28 (day of awakening)
  sleepDate: string; // YYYY-MM-DD local wake date in the profile timezone
  bedtime: string; // HH:MM
  wakeTime: string; // HH:MM
  sleepTime?: string; // legacy alias for bedtime (compatibility)
  duration: number; // minutes, computed via mod 1440 across midnight
  quality: SleepQuality;
  note?: string;
  source: SleepSource;
  status: SleepStatus;
  timezone: string;
  createdAt: number;
  updatedAt: number;
}

// Per-day aggregate summary used by the UI: duration is the sum of completed
// entries; sleepTime is always present (alias of the primary bedtime).
export interface SleepDaySummary extends SleepEntry {
  sleepTime: string;
}

export function isValidHHMM(value: string | undefined | null): boolean {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseHHMM(value: string): number | null {
  if (!isValidHHMM(value)) return null;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

// Duration in minutes between bedtime and wakeTime, handling rollover past midnight.
export function sleepDurationMinutes(bedtime: string | undefined | null, wakeTime: string | undefined | null): number {
  if (!isValidHHMM(bedtime) || !isValidHHMM(wakeTime)) return 0;
  const bed = parseHHMM(bedtime as string)!;
  const wake = parseHHMM(wakeTime as string)!;
  let duration = wake - bed;
  if (duration < 0) duration += 24 * 60;
  return duration;
}

// Stable dedupe key: prefer id, fall back to dayIndex + bedtime/wakeTime.
export function sleepEntryKey(e: Partial<SleepEntry> | null | undefined): string {
  if (e && typeof e.id === "string" && e.id) return `id:${e.id}`;
  const bed = e?.bedtime ?? e?.sleepTime ?? "";
  const wake = e?.wakeTime ?? "";
  const day = e?.dayIndex ?? "";
  return `d${day}|${bed}|${wake}`;
}

// Deterministic union of sleep journals: existing entries preserved, new (by stable
// key) appended, canonical sort by createdAt asc, then stable key asc.
export function mergeSleepEntries(
  existing: SleepEntry[] | null | undefined,
  incoming: SleepEntry[] | null | undefined
): SleepEntry[] {
  const seen = new Set<string>();
  const merged: SleepEntry[] = [];
  for (const e of existing ?? []) {
    const k = sleepEntryKey(e);
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(e);
    }
  }
  for (const e of incoming ?? []) {
    const k = sleepEntryKey(e);
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(e);
    }
  }
  merged.sort((a, b) => {
    const ta = typeof a?.createdAt === "number" && Number.isFinite(a.createdAt) ? a.createdAt : 0;
    const tb = typeof b?.createdAt === "number" && Number.isFinite(b.createdAt) ? b.createdAt : 0;
    if (ta !== tb) return ta - tb;
    return sleepEntryKey(a).localeCompare(sleepEntryKey(b));
  });
  return merged;
}

// Sum of durations over completed (non-draft) entries.
export function sumCompletedSleepMinutes(entries: SleepEntry[] | null | undefined): number {
  return (entries ?? [])
    .filter(e => e && e.status !== "draft")
    .reduce((sum, e) => sum + (Number(e?.duration) || 0), 0);
}

// Aggregate a journal into a per-day summary: duration is the sum of completed
// entries; the primary record (longest completed entry) supplies times/quality.
export function aggregateSleepPerDay(entries: SleepEntry[] | null | undefined): Record<number, SleepDaySummary> {
  const byDay: Record<number, SleepEntry[]> = {};
  for (const e of entries ?? []) {
    if (!e || e.dayIndex == null) continue;
    const arr = byDay[e.dayIndex] || (byDay[e.dayIndex] = []);
    arr.push(e);
  }
  const out: Record<number, SleepDaySummary> = {};
  for (const dayStr of Object.keys(byDay)) {
    const day = Number(dayStr);
    const arr = byDay[day];
    const completed = arr.filter(e => e.status !== "draft");
    const total = completed.reduce((sum, e) => sum + (Number(e?.duration) || 0), 0);
    const primary = [...completed].sort((a, b) => (Number(b?.duration) || 0) - (Number(a?.duration) || 0))[0] || arr[0];
    const bed = primary?.bedtime ?? primary?.sleepTime ?? "";
    out[day] = {
      ...primary,
      dayIndex: day,
      duration: total,
      sleepTime: bed,
      bedtime: bed,
    };
  }
  return out;
}

export function makeSleepId(): string {
  const epoch = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  return `sleep-${epoch}-${rand}`;
}

// Normalize an arbitrary record (legacy or new) into a canonical SleepEntry.
export function normalizeSleepEntry(
  raw: Partial<SleepEntry> & Record<string, any> | null | undefined
): SleepEntry | null {
  if (!raw || raw.dayIndex == null) return null;
  const bedtime = String(raw.bedtime ?? raw.sleepTime ?? "");
  const wakeTime = String(raw.wakeTime ?? "");
  const dayIndex = Number(raw.dayIndex);
  const now = Date.now();
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : makeSleepId(),
    dayIndex,
    sleepDate: typeof raw.sleepDate === "string" && raw.sleepDate ? raw.sleepDate : "",
    bedtime,
    sleepTime: bedtime,
    wakeTime,
    duration: Number(raw.duration) || sleepDurationMinutes(bedtime, wakeTime),
    quality: raw.quality === "good" || raw.quality === "fair" || raw.quality === "poor" ? raw.quality : null,
    note: typeof raw.note === "string" ? raw.note : undefined,
    source: raw.source === "quick" || raw.source === "manual" || raw.source === "anna-prompt" || raw.source === "legacy"
      ? raw.source
      : "legacy",
    status: raw.status === "draft" || raw.status === "completed" ? raw.status : "completed",
    timezone: typeof raw.timezone === "string" && raw.timezone ? raw.timezone : "",
    createdAt: Number(raw.createdAt) || now,
    updatedAt: Number(raw.updatedAt) || now,
  };
}
