import { DEFAULT_TIMEZONE, browserTimezone, validateIanaTimeZone } from "./dates";

let effectiveTimeZone: string | null = null;

export function setUserTimeZone(tz: unknown): string {
  if (typeof tz === "string" && tz.trim() !== "") {
    try {
      validateIanaTimeZone(tz);
      effectiveTimeZone = tz;
      return tz;
    } catch {
      // Invalid explicit value — fall through to fallback chain.
    }
  }
  try {
    effectiveTimeZone = browserTimezone();
  } catch {
    effectiveTimeZone = DEFAULT_TIMEZONE;
  }
  return effectiveTimeZone;
}

export function getUserTimeZone(): string {
  if (effectiveTimeZone) return effectiveTimeZone;
  return setUserTimeZone(undefined);
}