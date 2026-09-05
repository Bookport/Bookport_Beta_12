import {
  avatarManifest,
  type AvatarSeries,
} from "../assets/images/anna/anna-manifest";
import {
  clampAnnaAvatarIntensity,
  isAnnaAvatarIntent,
  type AnnaAvatarIntensity,
  type AnnaAvatarIntent,
  type AnnaAvatarResult,
  type AnnaAvatarUiState,
  type AnnaToneGroup,
} from "../types/annaAvatar";
import {
  planAvatarForAssistantReply,
  planAvatarForUiState,
  planAvatarForUserInput,
} from "./annaAvatarPlanner";

/**
 * Legacy tone-group names are retained because several existing components
 * still call resolveAvatar() with the historical compact strings.
 */
export type LegacyToneGroup =
  | "neutralthoughtful"
  | "remindercaution"
  | "negativedispleasure"
  | "mockerysarcasm"
  | "surprisefear";

export type ToneGroup = AnnaToneGroup | LegacyToneGroup;

export type StateNowTabId =
  | "balance"
  | "scales"
  | "kbju"
  | "micro"
  | "composition"
  | "dynamics";

export interface AvatarResult extends AnnaAvatarResult {}

export interface AvatarParams {
  toneGroup: ToneGroup;
  intent?: string | null;
  intensity?: number | null;
}

const LEGACY_TONE_GROUPS: Record<LegacyToneGroup, AnnaToneGroup> = {
  neutralthoughtful: "neutral_thoughtful",
  remindercaution: "reminder_caution",
  negativedispleasure: "negative_displeasure",
  mockerysarcasm: "mockery_sarcasm",
  surprisefear: "surprise_fear",
};

const FALLBACK_INTENT_BY_TONE_GROUP: Record<
  AnnaToneGroup,
  AnnaAvatarIntent
> = {
  positive: "affirmation",
  neutral_thoughtful: "thoughtful",
  reminder_caution: "useful_reminder",
  negative_displeasure: "disappointment",
  mockery_sarcasm: "mockery",
  surprise_fear: "surprise",
};

/**
 * Old resolver aliases and likely LLM spellings.
 *
 * The right-hand values are the only canonical intent names permitted by the
 * actual anna-manifest.ts. New code should always pass the canonical names.
 */
const INTENT_ALIASES: Record<string, AnnaAvatarIntent> = {
  affirmation: "affirmation",
  importantaffirmation: "important_affirmation",
  support: "joy_and_support",
  usersuccess: "joy_user_success",
  user_success: "joy_user_success",
  success: "success",
  joy: "joy",
  joyandadmiration: "joy_and_admiration",
  joy_and_admiration: "joy_and_admiration",
  joyandsupport: "joy_and_support",
  joy_and_support: "joy_and_support",
  joyusersuccess: "joy_user_success",
  joy_user_success: "joy_user_success",
  approval: "cheerful_approval",
  cheerfulapproval: "cheerful_approval",
  cheerful_approval: "cheerful_approval",
  satisfaction: "satisfaction",
  satisfactionuseraction: "satisfaction_user_action",
  satisfaction_user_action: "satisfaction_user_action",
  laughter1: "laughter_1",
  laughter_1: "laughter_1",
  laughter2: "laughter_2",
  laughter_2: "laughter_2",
  laughterandjoyv1: "laughter_and_joy_v1",
  laughter_and_joy_v1: "laughter_and_joy_v1",

  thoughtful: "thoughtful",
  thoughtfulv1: "thoughtful_v1",
  thoughtful_v1: "thoughtful_v1",
  explanation: "explanation",
  clearexplanation: "clear_explanation",
  clear_explanation: "clear_explanation",
  nuance: "understanding_nuances",
  understandingnuances: "understanding_nuances",
  understanding_nuances: "understanding_nuances",
  subtlety: "subtleties",
  subtleties: "subtleties",
  question: "questioning",
  questioning: "questioning",
  curiosity: "curiosity",
  curioussurprise: "curious_surprise",
  curious_surprise: "curious_surprise",
  wonderingthought: "wondering_thought",
  wondering_thought: "wondering_thought",
  thoughtandsurprise: "thought_and_surprise",
  thought_and_surprise: "thought_and_surprise",
  admiration: "admiration",
  scrutinizing: "scrutinizing",
  dreams: "dreams_and_fantasies",
  dreamsandfantasies: "dreams_and_fantasies",
  dreams_and_fantasies: "dreams_and_fantasies",
  fantasizing: "fantasizing",
  questioningsurpriseuseraction: "questioning_surprise_user_action",
  questioning_surprise_user_action: "questioning_surprise_user_action",

  reminder: "useful_reminder",
  usefulreminder: "useful_reminder",
  useful_reminder: "useful_reminder",
  importantreminder: "important_reminder",
  important_reminder: "important_reminder",
  cheerfulreminder: "cheerful_reminder",
  cheerful_reminder: "cheerful_reminder",
  caution: "caution",
  warning: "warning",
  importantwarning: "important_warning",
  important_warning: "important_warning",
  seriousreminderwarning: "serious_reminder_warning",
  serious_reminder_warning: "serious_reminder_warning",
  warningandprohibition: "warning_and_prohibition",
  warning_and_prohibition: "warning_and_prohibition",
  clarification: "important_clarification",
  importantclarification: "important_clarification",
  important_clarification: "important_clarification",

  annoyed: "annoyed",
  disappointment: "disappointment",
  disappointmentanddissatisfaction: "disappointment_and_dissatisfaction",
  disappointment_and_dissatisfaction: "disappointment_and_dissatisfaction",
  denial: "denial",
  denialandprohibitions: "denial_and_prohibitions",
  denial_and_prohibitions: "denial_and_prohibitions",
  rejectiondenialfatigue: "rejection_denial_fatigue",
  rejection_denial_fatigue: "rejection_denial_fatigue",
  offense: "offense",
  offenseandanger: "offense_and_anger",
  offense_and_anger: "offense_and_anger",
  irritationandanger: "irritation_and_anger",
  irritation_and_anger: "irritation_and_anger",
  anger: "anger",
  screaming: "screaming",
  annascreaming: "anna_screaming",
  anna_screaming: "anna_screaming",

  mockery: "mockery",
  mockeryinterlocutor: "mockery_interlocutor",
  mockery_interlocutor: "mockery_interlocutor",
  condescension: "condescension",
  flirting: "flirting",
  flirtingandteasing: "flirting_and_teasing",
  flirting_and_teasing: "flirting_and_teasing",
  sweetsour: "sweet_sour",
  sweet_sour: "sweet_sour",
  sweettosour: "sweet_to_sour",
  sweet_to_sour: "sweet_to_sour",

  surprise: "surprise",
  frightenedsurprise: "frightened_surprise",
  frightened_surprise: "frightened_surprise",
  curiosityandsurprise: "curiosity_and_surprise",
  curiosity_and_surprise: "curiosity_and_surprise",
  sick: "sick",
  annasecrets: "anna_secrets",
  anna_secrets: "anna_secrets",
  misunderstanding: "misunderstanding",

  warmencouragement: "affirmation",
  warm_encouragement: "affirmation",
  scientificapproval: "important_affirmation",
  joyandcelebration: "joy_and_admiration",
  joy_and_celebration: "joy_and_admiration",
};

const STATE_NOW_TAB_SELECTIONS: Record<
  StateNowTabId,
  { intent: AnnaAvatarIntent; intensity: AnnaAvatarIntensity }
> = {
  balance: { intent: "explanation", intensity: 3 },
  scales: { intent: "clear_explanation", intensity: 3 },
  kbju: { intent: "explanation", intensity: 3 },
  micro: { intent: "understanding_nuances", intensity: 3 },
  composition: { intent: "subtleties", intensity: 3 },
  dynamics: { intent: "thoughtful", intensity: 3 },
};

const UI_STATES: readonly AnnaAvatarUiState[] = [
  "На связи",
  "Слушаю",
  "Думаю",
  "Отвечаю",
  "Занята",
  "Нет в сети",
] as const;

function normalizeIntentToken(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replace(/[`'"«»]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isLegacyToneGroup(
  value: ToneGroup,
): value is LegacyToneGroup {
  return Object.prototype.hasOwnProperty.call(LEGACY_TONE_GROUPS, value);
}

function normalizeToneGroup(toneGroup: ToneGroup): AnnaToneGroup {
  if (isLegacyToneGroup(toneGroup)) {
    return LEGACY_TONE_GROUPS[toneGroup];
  }

  return toneGroup;
}

function isAnnaAvatarUiState(value: string): value is AnnaAvatarUiState {
  return (UI_STATES as readonly string[]).includes(value);
}

function getSeries(intent: AnnaAvatarIntent): AvatarSeries | null {
  return avatarManifest.series[intent] ?? null;
}

function toAvatarResult(
  series: AvatarSeries,
  intensity: AnnaAvatarIntensity,
): AvatarResult {
  return {
    key: series.key as AnnaAvatarIntent,
    src: `/anna/${series.key}/${intensity}.webp`,
    level: intensity,
    toneGroup: series.toneGroup as AnnaToneGroup,
    description: series.description,
  };
}

/**
 * Converts legacy, user-friendly and LLM intent spellings into one of the
 * actual snake_case keys in anna-manifest.ts.
 */
export function normalizeAnnaAvatarIntent(
  value: string | null | undefined,
): AnnaAvatarIntent | null {
  if (!value) {
    return null;
  }

  const normalized = normalizeIntentToken(value);

  if (isAnnaAvatarIntent(normalized)) {
    return normalized;
  }

  return INTENT_ALIASES[normalized] ?? null;
}

/**
 * The only function that turns an intent into a concrete avatar WebP result.
 */
export function resolveAvatar(params: AvatarParams): AvatarResult {
  const toneGroup = normalizeToneGroup(params.toneGroup);
  const intensity = clampAnnaAvatarIntensity(params.intensity, 3);
  const requestedIntent = normalizeAnnaAvatarIntent(params.intent);
  const fallbackIntent = FALLBACK_INTENT_BY_TONE_GROUP[toneGroup];

  const selectedSeries =
    (requestedIntent ? getSeries(requestedIntent) : null) ??
    getSeries(fallbackIntent) ??
    getSeries("thoughtful");

  if (!selectedSeries) {
    throw new Error("Anna avatar manifest has no usable fallback series.");
  }

  return toAvatarResult(selectedSeries, intensity);
}

export function resolveAvatarForIntent(
  intent: string | null | undefined,
  intensity?: number | null,
): AvatarResult {
  const canonicalIntent = normalizeAnnaAvatarIntent(intent) ?? "thoughtful";
  const series = getSeries(canonicalIntent) ?? getSeries("thoughtful");

  if (!series) {
    throw new Error("Anna avatar manifest has no thoughtful fallback series.");
  }

  return toAvatarResult(series, clampAnnaAvatarIntensity(intensity, 3));
}

export function resolveAvatarForUiState(
  state: AnnaAvatarUiState,
): AvatarResult {
  const selection = planAvatarForUiState(state);

  return resolveAvatarForIntent(selection.intent, selection.intensity);
}

export function resolveAvatarForTab(tabId: StateNowTabId): AvatarResult {
  const selection = STATE_NOW_TAB_SELECTIONS[tabId];

  return resolveAvatarForIntent(selection.intent, selection.intensity);
}

export function resolveGeneralAvatar(): AvatarResult {
  return resolveAvatarForIntent("useful_reminder", 3);
}

/**
 * Compatibility wrapper for existing views.
 *
 * New code should use resolveAvatarForIntent(), resolveAvatarForUiState(), or
 * a context adapter from the planner instead of combining state and text.
 */
export function resolveAvatarByState(
  state: string,
  textContext?: string,
  intensity?: number,
): AvatarResult {
  if (state === "Думаю" && textContext?.trim()) {
    const selection = planAvatarForUserInput(textContext, intensity);
    return resolveAvatarForIntent(selection.intent, selection.intensity);
  }

  if (state === "Отвечаю" && textContext?.trim()) {
    const selection = planAvatarForAssistantReply(
      textContext,
      "assistant_reply",
      intensity,
    );
    return resolveAvatarForIntent(selection.intent, selection.intensity);
  }

  if (isAnnaAvatarUiState(state)) {
    const selection = planAvatarForUiState(state);
    return resolveAvatarForIntent(
      selection.intent,
      intensity ?? selection.intensity,
    );
  }

  return resolveAvatarForIntent("thoughtful", intensity ?? 3);
}

/**
 * Deterministic WFPB reaction based only on the current analysis result.
 * It deliberately has no global counter and no render-order dependency.
 */
export function resolveAvatarForCompliance(
  violationCount: number,
  totalCount: number,
): AvatarResult {
  const violations = Math.max(
    0,
    Math.round(Number.isFinite(violationCount) ? violationCount : 0),
  );
  const total = Math.max(
    violations,
    Math.round(Number.isFinite(totalCount) ? totalCount : 0),
  );

  if (violations === 0) {
    return resolveAvatarForIntent("cheerful_approval", 2);
  }

  const ratio = total > 0 ? violations / total : 1;

  if (violations === 1 && ratio < 0.5) {
    return resolveAvatarForIntent("important_reminder", 2);
  }

  if (ratio >= 0.7 || violations >= 4) {
    return resolveAvatarForIntent(
      "serious_reminder_warning",
      Math.min(6, Math.max(3, violations)) as AnnaAvatarIntensity,
    );
  }

  return resolveAvatarForIntent(
    "irritation_and_anger",
    Math.min(5, Math.max(3, violations)) as AnnaAvatarIntensity,
  );
}
