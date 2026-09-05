/**
 * Canonical avatar contract for Anna.
 *
 * This module intentionally has no React, browser, LLM, or asset imports.
 * It is safe to use from UI components, server code, and verification scripts.
 */

export const ANNA_AVATAR_INTENTS = [
  // positive — 13
  "affirmation",
  "important_affirmation",
  "joy",
  "joy_and_admiration",
  "joy_and_support",
  "joy_user_success",
  "laughter_1",
  "laughter_2",
  "laughter_and_joy_v1",
  "cheerful_approval",
  "success",
  "satisfaction",
  "satisfaction_user_action",

  // neutral_thoughtful — 16
  "thoughtful",
  "thoughtful_v1",
  "explanation",
  "clear_explanation",
  "understanding_nuances",
  "subtleties",
  "curiosity",
  "curious_surprise",
  "wondering_thought",
  "thought_and_surprise",
  "questioning",
  "questioning_surprise_user_action",
  "admiration",
  "scrutinizing",
  "dreams_and_fantasies",
  "fantasizing",

  // reminder_caution — 9
  "useful_reminder",
  "important_reminder",
  "cheerful_reminder",
  "important_warning",
  "serious_reminder_warning",
  "warning",
  "warning_and_prohibition",
  "caution",
  "important_clarification",

  // negative_displeasure — 12
  "annoyed",
  "disappointment",
  "disappointment_and_dissatisfaction",
  "denial",
  "denial_and_prohibitions",
  "rejection_denial_fatigue",
  "offense",
  "offense_and_anger",
  "irritation_and_anger",
  "anger",
  "screaming",
  "anna_screaming",

  // mockery_sarcasm — 7
  "mockery",
  "mockery_interlocutor",
  "condescension",
  "flirting",
  "flirting_and_teasing",
  "sweet_sour",
  "sweet_to_sour",

  // surprise_fear — 6
  "surprise",
  "frightened_surprise",
  "curiosity_and_surprise",
  "sick",
  "anna_secrets",
  "misunderstanding",
] as const;

export type AnnaAvatarIntent = (typeof ANNA_AVATAR_INTENTS)[number];

export const ANNA_AVATAR_INTENSITIES = [1, 2, 3, 4, 5, 6] as const;

export type AnnaAvatarIntensity = (typeof ANNA_AVATAR_INTENSITIES)[number];

/**
 * Values are intentionally identical to the current manifest and resolver
 * so existing callers can migrate without a parallel naming system.
 */
export type AnnaToneGroup =
  | "positive"
  | "neutral_thoughtful"
  | "reminder_caution"
  | "negative_displeasure"
  | "mockery_sarcasm"
  | "surprise_fear";

export type AnnaAvatarUiState =
  | "На связи"
  | "Слушаю"
  | "Думаю"
  | "Отвечаю"
  | "Занята"
  | "Нет в сети";

export type AnnaAvatarScope =
  | "system"
  | "user_input"
  | "assistant_reply"
  | "chat"
  | "dish_analysis"
  | "mixer"
  | "water"
  | "movement"
  | "measurements"
  | "organism"
  | "state_now";

export type AnnaAvatarConfidence = "high" | "medium" | "fallback";

export interface AnnaAvatarSelection {
  intent: AnnaAvatarIntent;
  intensity: AnnaAvatarIntensity;
  source:
    | "ui_state"
    | "server_prefix"
    | "module_outcome"
    | "lexicon"
    | "fallback";
  confidence: AnnaAvatarConfidence;
}

export interface AnnaAvatarResult {
  key: AnnaAvatarIntent;
  src: string;
  level: AnnaAvatarIntensity;
  toneGroup: AnnaToneGroup;
  description: string;
}

export interface AnnaAvatarLexiconRule {
  id: string;
  scope: AnnaAvatarScope;
  priority: number;
  intent: AnnaAvatarIntent;
  intensity: AnnaAvatarIntensity;
  phrases?: readonly string[];
  allWords?: readonly string[];
  anyWords?: readonly string[];
  excludePhrases?: readonly string[];
}

export interface AnnaAvatarContext {
  scope: AnnaAvatarScope;
  text?: string;
  intensity?: number;
  explicitIntent?: string | null;
  moduleData?: Record<string, unknown>;
}

export function isAnnaAvatarIntent(value: unknown): value is AnnaAvatarIntent {
  return (
    typeof value === "string" &&
    (ANNA_AVATAR_INTENTS as readonly string[]).includes(value)
  );
}

export function clampAnnaAvatarIntensity(
  value: unknown,
  fallback: AnnaAvatarIntensity = 3,
): AnnaAvatarIntensity {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const rounded = Math.round(numeric);

  if (rounded <= 1) {
    return 1;
  }

  if (rounded >= 6) {
    return 6;
  }

  return rounded as AnnaAvatarIntensity;
}
