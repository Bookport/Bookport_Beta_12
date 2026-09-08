import {
  DEFAULT_TIMEZONE,
  todayLocalDate,
  validateIanaTimeZone,
} from "../shared/dates";

export type LocalDayRange = {
  timeZone: string;
  localDate: string;
  start: Date;
  end: Date;
};

function formatLocalDateParts(value: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const getPart = (type: string): number => {
    const raw = parts.find((part) => part.type === type)?.value;
    return Number(raw);
  };

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
}

function formatDate(year: number, month: number, day: number): string {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function offsetMillisecondsAt(value: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    timeZoneName: "longOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  const offsetName =
    parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";

  const match = offsetName.match(/^GMT(?:(?<sign>[+-])(?<hour>\d{2}):(?<minute>\d{2}))?$/);

  if (!match?.groups?.sign) return 0;

  const minutes =
    Number(match.groups.hour) * 60 + Number(match.groups.minute);

  return (match.groups.sign === "+" ? 1 : -1) * minutes * 60_000;
}

export function resolveTimeZone(timeZone?: string | null): string {
  const candidate = timeZone || DEFAULT_TIMEZONE;
  try {
    validateIanaTimeZone(candidate);
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function localMidnightToUtc(
  localDate: string,
  timeZone?: string | null,
): Date {
  const zone = resolveTimeZone(timeZone);
  const nominalUtc = new Date(`${localDate}T00:00:00.000Z`);
  const offset = offsetMillisecondsAt(nominalUtc, zone);
  return new Date(nominalUtc.getTime() - offset);
}

export function addLocalDays(localDate: string, days: number): string {
  const base = new Date(`${localDate}T12:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function getTodayLocalDayRange(
  timeZone?: string | null,
): LocalDayRange {
  const zone = resolveTimeZone(timeZone);
  const localDate = todayLocalDate(zone);
  const nextLocalDate = addLocalDays(localDate, 1);

  return {
    timeZone: zone,
    localDate,
    start: localMidnightToUtc(localDate, zone),
    end: localMidnightToUtc(nextLocalDate, zone),
  };
}

export function getPreviousLocalDayRange(
  timeZone?: string | null,
): LocalDayRange {
  const today = getTodayLocalDayRange(timeZone);
  const previousLocalDate = addLocalDays(today.localDate, -1);

  return {
    timeZone: today.timeZone,
    localDate: previousLocalDate,
    start: localMidnightToUtc(previousLocalDate, today.timeZone),
    end: today.start,
  };
}

export function getLocalDateForInstant(
  value: Date,
  timeZone?: string | null,
): string {
  const zone = resolveTimeZone(timeZone);
  const { year, month, day } = formatLocalDateParts(value, zone);
  return formatDate(year, month, day);
}

/**
 * Returns the start and end timestamps (ms) of the local day for a given date string and IANA time zone.
 * dateStr is expected in "YYYY-MM-DD" format.
 */
export function getLocalDayBounds(
  dateStr: string,
  timeZone?: string
): { startMs: number; endMs: number } {
  const zone = resolveTimeZone(timeZone);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new RangeError(`Invalid local date: ${dateStr}`);
  }

  const [year, month, day] = dateStr.split("-").map(Number);

  const localMidnightToUtcMs = (
    y: number,
    m: number,
    d: number
  ): number => {
    const utcGuess = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
    const firstOffset = offsetMillisecondsAt(new Date(utcGuess), zone);
    const corrected = utcGuess - firstOffset;
    const correctedOffset = offsetMillisecondsAt(new Date(corrected), zone);

    return utcGuess - correctedOffset;
  };

  const startMs = localMidnightToUtcMs(year, month, day);

  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const endMs = localMidnightToUtcMs(
    nextDate.getUTCFullYear(),
    nextDate.getUTCMonth() + 1,
    nextDate.getUTCDate()
  );

  return { startMs, endMs };
};
