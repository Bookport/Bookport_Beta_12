// MissedSleepPrompt persistence: localStorage state under wfpb_missed_sleep_prompt_v1.
// Pure functions only — the UI layer (MissedSleepPrompt.tsx) decides when to call them.
// Day-scoped counters roll over on the profile timezone's local date.

import { todayLocalDate } from "./dates";

export const SLEEP_PROMPT_STORAGE_KEY = "wfpb_missed_sleep_prompt_v1";
export const SLEEP_PROMPT_MAX_SHOWS_PER_DAY = 2;
export const SLEEP_PROMPT_SNOOZE_MS = 4 * 60 * 60 * 1000; // «Позже» cooldown
export const SLEEP_PROMPT_ACTIVE_GATE_SECONDS = 300; // 5 minutes of visible active usage

export interface MissedSleepPromptState {
  version: 1;
  day: string; // local date (profile tz) this counter state belongs to
  showsToday: number; // 0..SLEEP_PROMPT_MAX_SHOWS_PER_DAY
  snoozedUntil: number; // epoch ms — «Позже» cooldown
  suppressedDay: string | null; // «Не отслеживать сегодня» — local date of suppression
  lastShownAt: number; // epoch ms of the last real show
}

const EMPTY_STATE: MissedSleepPromptState = {
  version: 1,
  day: "",
  showsToday: 0,
  snoozedUntil: 0,
  suppressedDay: null,
  lastShownAt: 0,
};

function freshState(tz: string, nowMs: number): MissedSleepPromptState {
  return {
    ...EMPTY_STATE,
    day: todayLocalDate(tz),
    snoozedUntil: nowMs,
  };
}

// Roll day-scoped fields over when the local date changed.
function rollover(state: MissedSleepPromptState, tz: string): MissedSleepPromptState {
  const today = todayLocalDate(tz);
  if (state.day === today) return state;
  return {
    ...state,
    day: today,
    showsToday: 0,
    snoozedUntil: 0,
    suppressedDay: state.suppressedDay === today ? state.suppressedDay : null,
  };
}

export function loadMissedSleepPromptState(tz: string, nowMs: number): MissedSleepPromptState {
  if (typeof window === "undefined") return freshState(tz, nowMs);
  try {
    const raw = window.localStorage.getItem(SLEEP_PROMPT_STORAGE_KEY);
    if (!raw) return freshState(tz, nowMs);
    const parsed = JSON.parse(raw) as Partial<MissedSleepPromptState>;
    const state: MissedSleepPromptState = {
      version: 1,
      day: typeof parsed.day === "string" ? parsed.day : "",
      showsToday: Number(parsed.showsToday) || 0,
      snoozedUntil: Number(parsed.snoozedUntil) || 0,
      suppressedDay: typeof parsed.suppressedDay === "string" ? parsed.suppressedDay : null,
      lastShownAt: Number(parsed.lastShownAt) || 0,
    };
    return rollover(state, tz);
  } catch {
    return freshState(tz, nowMs);
  }
}

export function saveMissedSleepPromptState(state: MissedSleepPromptState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SLEEP_PROMPT_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// Gate check — true only when the plaque may actually appear.
export function canShowMissedSleepPrompt(
  state: MissedSleepPromptState,
  nowMs: number,
  tz: string
): boolean {
  const today = todayLocalDate(tz);
  if (state.suppressedDay === today) return false;
  if (nowMs < state.snoozedUntil) return false;
  if (state.showsToday >= SLEEP_PROMPT_MAX_SHOWS_PER_DAY) return false;
  return true;
}

// Counts a real show (increments showsToday, sets lastShownAt).
export function markMissedSleepPromptShown(
  state: MissedSleepPromptState,
  tz: string,
  nowMs: number
): MissedSleepPromptState {
  const rolled = rollover(state, tz);
  return {
    ...rolled,
    showsToday: Math.min(SLEEP_PROMPT_MAX_SHOWS_PER_DAY, rolled.showsToday + 1),
    lastShownAt: nowMs,
  };
}

// «Позже» — 4h cooldown from now.
export function snoozeMissedSleepPrompt(
  state: MissedSleepPromptState,
  nowMs: number
): MissedSleepPromptState {
  return { ...state, snoozedUntil: nowMs + SLEEP_PROMPT_SNOOZE_MS };
}

// «Не отслеживать сегодня» — suppress until the next local day.
export function suppressMissedSleepPromptToday(
  state: MissedSleepPromptState,
  tz: string
): MissedSleepPromptState {
  return { ...state, suppressedDay: todayLocalDate(tz) };
}