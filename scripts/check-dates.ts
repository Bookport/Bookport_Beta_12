import {
  DEFAULT_TIMEZONE,
  addDays,
  browserTimezone,
  dayIndexBetween,
  formatTimeHM,
  toDateOnly,
  toLocalDate,
  todayLocalDate,
  validateIanaTimeZone,
} from "../src/shared/dates";

let failures = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`ok: ${message}`);
  } else {
    console.error(`FAIL: ${message}`);
    failures += 1;
  }
}

function throwsRangeError(fn: () => void): boolean {
  try {
    fn();
  } catch (error) {
    return error instanceof RangeError;
  }
  return false;
}

function main(): void {
  const noon = new Date("2026-08-15T12:00:00.000Z");

  assert(toLocalDate(noon, "UTC") === "2026-08-15", "UTC noon -> 2026-08-15");
  assert(toLocalDate(noon, "Europe/Moscow") === "2026-08-15", "Moscow noon -> 2026-08-15 (15:00 local)");
  assert(toLocalDate(noon, "Asia/Shanghai") === "2026-08-15", "Shanghai noon -> 2026-08-15 (20:00 local)");
  assert(toLocalDate(noon, "America/Los_Angeles") === "2026-08-15", "LA noon -> 2026-08-15 (05:00 PDT local)");

  assert(toLocalDate(new Date("2026-08-15T23:59:59.000Z"), "UTC") === "2026-08-15", "UTC 23:59:59Z -> 2026-08-15");
  assert(toLocalDate(new Date("2026-08-16T00:00:00.000Z"), "UTC") === "2026-08-16", "UTC 00:00:00Z -> 2026-08-16");

  assert(
    toLocalDate(new Date("2026-08-15T20:59:59.000Z"), "Europe/Moscow") === "2026-08-15",
    "Moscow 20:59:59Z -> 2026-08-15",
  );
  assert(toLocalDate(new Date("2026-08-15T21:00:00.000Z"), "Europe/Moscow") === "2026-08-16", "Moscow 21:00Z -> 2026-08-16");

  assert(
    toLocalDate(new Date("2026-08-16T06:59:59.000Z"), "America/Los_Angeles") === "2026-08-15",
    "LA 06:59:59Z -> 2026-08-15",
  );
  assert(
    toLocalDate(new Date("2026-08-16T07:00:00.000Z"), "America/Los_Angeles") === "2026-08-16",
    "LA 07:00:00Z -> 2026-08-16",
  );

  assert(toLocalDate(new Date("2026-08-15T15:59:59.000Z"), "Asia/Shanghai") === "2026-08-15", "Shanghai 15:59:59Z -> 2026-08-15");
  assert(toLocalDate(new Date("2026-08-15T16:00:00.000Z"), "Asia/Shanghai") === "2026-08-16", "Shanghai 16:00:00Z -> 2026-08-16");

  assert(
    throwsRangeError(() => validateIanaTimeZone("Mars/Olympus")),
    "validateIanaTimeZone('Mars/Olympus') throws RangeError",
  );
  assert(
    throwsRangeError(() => todayLocalDate("Mars/Olympus")),
    "todayLocalDate('Mars/Olympus') throws RangeError",
  );
  assert(
    throwsRangeError(() => toLocalDate(new Date(), "Mars/Olympus")),
    "toLocalDate(now, 'Mars/Olympus') throws RangeError",
  );

  assert(
    toDateOnly("2026-08-15").toISOString() === "2026-08-15T00:00:00.000Z",
    "toDateOnly('2026-08-15').toISOString() === '2026-08-15T00:00:00.000Z'",
  );
  assert(toDateOnly("2026-08-15").getUTCHours() === 0 && toDateOnly("2026-08-15").getUTCMinutes() === 0, "toDateOnly has zero UTC time");

  assert(addDays(toDateOnly("2026-08-15"), 1).toISOString() === "2026-08-16T00:00:00.000Z", "addDays(+1)");
  assert(addDays(toDateOnly("2026-08-15"), -1).toISOString() === "2026-08-14T00:00:00.000Z", "addDays(-1)");

  const courseStart = toDateOnly("2026-08-01");
  assert(dayIndexBetween(courseStart, "2026-08-01") === 1, "dayIndexBetween day 1");
  assert(dayIndexBetween(courseStart, "2026-08-15") === 15, "dayIndexBetween day 15");
  assert(dayIndexBetween(courseStart, "2026-08-28") === 28, "dayIndexBetween day 28");
  assert(dayIndexBetween(courseStart, "2026-08-29") === 28, "dayIndexBetween clamps upper bound");
  assert(dayIndexBetween(courseStart, "2026-07-31") === 1, "dayIndexBetween clamps lower bound");

  assert(formatTimeHM("2026-08-15T15:30:00.000Z", "UTC") === "15:30", "formatTimeHM UTC 15:30");
  assert(formatTimeHM("2026-08-15T15:30:00.000Z", "Europe/Moscow") === "18:30", "formatTimeHM Moscow 18:30");
  assert(formatTimeHM("2026-08-15T15:30:00.000Z", "Asia/Shanghai") === "23:30", "formatTimeHM Shanghai 23:30");

  const today = todayLocalDate("UTC");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(today), "todayLocalDate returns YYYY-MM-DD");
  assert(today === toLocalDate(new Date(), "UTC"), "todayLocalDate matches toLocalDate(now)");

  assert(browserTimezone() === DEFAULT_TIMEZONE, "browserTimezone() falls back to DEFAULT_TIMEZONE on server");

  if (failures > 0) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nAll date checks passed.");
}

main();