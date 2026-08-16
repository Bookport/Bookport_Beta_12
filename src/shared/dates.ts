export const DEFAULT_TIMEZONE = "Europe/Moscow";

export function validateIanaTimeZone(tz: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format();
  } catch {
    throw new RangeError(`Invalid IANA time zone: "${tz}"`);
  }
}

function toParts(value: Date, tz: string, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, ...options }).formatToParts(value);
  const result: Record<string, string> = {};
  for (const part of parts) {
    result[part.type] = part.value;
  }
  return result;
}

export function toLocalDate(value: Date, tz: string): string {
  validateIanaTimeZone(tz);
  const { year, month, day } = toParts(value, tz, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${year}-${month}-${day}`;
}

export function todayLocalDate(tz: string): string {
  return toLocalDate(new Date(), tz);
}

export function toDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function addDays(date: Date, n: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + n);
  return result;
}

export function dayIndexBetween(courseStart: Date, todayLocal: string): number {
  const start = toDateOnly(toLocalDate(courseStart, "UTC"));
  const today = toDateOnly(todayLocal);
  const msPerDay = 86_400_000;
  const index = Math.round((today.getTime() - start.getTime()) / msPerDay) + 1;
  return Math.min(28, Math.max(1, index));
}

export function formatTimeHM(iso: string, tz: string): string {
  validateIanaTimeZone(tz);
  const value = new Date(iso);
  const { hour, minute } = toParts(value, tz, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${hour}:${minute}`;
}

export function browserTimezone(): string {
  if (typeof window === "undefined") {
    return DEFAULT_TIMEZONE;
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) {
      return DEFAULT_TIMEZONE;
    }
    validateIanaTimeZone(tz);
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}