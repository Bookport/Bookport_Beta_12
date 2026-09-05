import {
  ANNA_AVATAR_LEXICON,
  ANNA_AVATAR_LEXICON_BY_SCOPE,
} from "../data/annaAvatarLexicon";
import {
  clampAnnaAvatarIntensity,
  isAnnaAvatarIntent,
  type AnnaAvatarContext,
  type AnnaAvatarIntent,
  type AnnaAvatarLexiconRule,
  type AnnaAvatarScope,
  type AnnaAvatarSelection,
  type AnnaAvatarUiState,
} from "../types/annaAvatar";

const SCOPE_FALLBACKS: Record<
  AnnaAvatarScope,
  Pick<AnnaAvatarSelection, "intent" | "intensity">
> = {
  system: { intent: "thoughtful", intensity: 2 },
  user_input: { intent: "curiosity", intensity: 2 },
  assistant_reply: { intent: "clear_explanation", intensity: 3 },
  chat: { intent: "thoughtful", intensity: 2 },
  dish_analysis: { intent: "explanation", intensity: 3 },
  mixer: { intent: "curious_surprise", intensity: 3 },
  water: { intent: "useful_reminder", intensity: 2 },
  movement: { intent: "joy_and_support", intensity: 2 },
  measurements: { intent: "clear_explanation", intensity: 2 },
  organism: { intent: "thoughtful", intensity: 2 },
  state_now: { intent: "explanation", intensity: 3 },
};

const UI_STATE_SELECTIONS: Record<
  AnnaAvatarUiState,
  Pick<AnnaAvatarSelection, "intent" | "intensity">
> = {
  "На связи": { intent: "thoughtful", intensity: 2 },
  "Слушаю": { intent: "curiosity", intensity: 2 },
  "Думаю": { intent: "thoughtful_v1", intensity: 3 },
  "Отвечаю": { intent: "clear_explanation", intensity: 3 },
  "Занята": { intent: "scrutinizing", intensity: 3 },
  "Нет в сети": { intent: "caution", intensity: 1 },
};

function normalizeText(value: string | undefined | null): string {
  return ` ${(value ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

function hasPhrase(normalizedText: string, phrase: string): boolean {
  const normalizedPhrase = normalizeText(phrase).trim();

  return normalizedPhrase.length > 0
    ? normalizedText.includes(` ${normalizedPhrase} `)
    : false;
}

function matchesRule(normalizedText: string, rule: AnnaAvatarLexiconRule): boolean {
  if (normalizedText.trim().length === 0) {
    return false;
  }

  if (
    rule.excludePhrases?.some((phrase) => hasPhrase(normalizedText, phrase))
  ) {
    return false;
  }

  const phraseMatched =
    rule.phrases?.some((phrase) => hasPhrase(normalizedText, phrase)) ?? false;

  const allWordsMatched =
    rule.allWords !== undefined &&
    rule.allWords.length > 0 &&
    rule.allWords.every((word) => hasPhrase(normalizedText, word));

  const anyWordsMatched =
    rule.anyWords !== undefined &&
    rule.anyWords.length > 0 &&
    rule.anyWords.some((word) => hasPhrase(normalizedText, word));

  return phraseMatched || allWordsMatched || anyWordsMatched;
}

function ruleSpecificity(rule: AnnaAvatarLexiconRule): number {
  const phraseLength = Math.max(
    0,
    ...(rule.phrases ?? []).map((phrase) => normalizeText(phrase).trim().length),
  );

  return (
    phraseLength +
    (rule.allWords?.length ?? 0) * 10 +
    (rule.anyWords?.length ?? 0) * 5
  );
}

function selectRule(
  scope: AnnaAvatarScope,
  normalizedText: string,
): AnnaAvatarLexiconRule | null {
  const scopedRules = ANNA_AVATAR_LEXICON_BY_SCOPE[scope];

  const matches = scopedRules.filter((rule) => matchesRule(normalizedText, rule));

  if (matches.length === 0) {
    return null;
  }

  return matches.sort((left, right) => {
    const priorityDifference = right.priority - left.priority;

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return ruleSpecificity(right) - ruleSpecificity(left);
  })[0];
}

function fallbackFor(scope: AnnaAvatarScope): AnnaAvatarSelection {
  const fallback = SCOPE_FALLBACKS[scope];

  return {
    ...fallback,
    source: "fallback",
    confidence: "fallback",
  };
}

/**
 * Returns an avatar decision from a scoped text/context input.
 *
 * Explicit canonical intent is accepted for deterministic module outcomes.
 * Legacy aliases and LLM prefix parsing intentionally belong to a separate
 * boundary adapter, which will be added in the server integration stage.
 */
export function planAnnaAvatar(
  context: AnnaAvatarContext,
): AnnaAvatarSelection {
  if (isAnnaAvatarIntent(context.explicitIntent)) {
    return {
      intent: context.explicitIntent,
      intensity: clampAnnaAvatarIntensity(context.intensity, 3),
      source: "module_outcome",
      confidence: "high",
    };
  }

  const normalizedText = normalizeText(context.text);
  const matchedRule = selectRule(context.scope, normalizedText);

  if (matchedRule) {
    return {
      intent: matchedRule.intent,
      intensity: clampAnnaAvatarIntensity(
        context.intensity,
        matchedRule.intensity,
      ),
      source: "lexicon",
      confidence: "high",
    };
  }

  return fallbackFor(context.scope);
}

export function planAvatarForUserInput(
  text: string,
  intensity?: number,
): AnnaAvatarSelection {
  return planAnnaAvatar({
    scope: "user_input",
    text,
    intensity,
  });
}

export function planAvatarForAssistantReply(
  text: string,
  scope: Exclude<AnnaAvatarScope, "user_input" | "system"> = "assistant_reply",
  intensity?: number,
): AnnaAvatarSelection {
  return planAnnaAvatar({
    scope,
    text,
    intensity,
  });
}

export function planAvatarForUiState(
  state: AnnaAvatarUiState,
): AnnaAvatarSelection {
  const selection = UI_STATE_SELECTIONS[state];

  return {
    ...selection,
    source: "ui_state",
    confidence: "high",
  };
}

export function planAvatarForExplicitIntent(
  intent: AnnaAvatarIntent,
  intensity?: number,
): AnnaAvatarSelection {
  return {
    intent,
    intensity: clampAnnaAvatarIntensity(intensity, 3),
    source: "module_outcome",
    confidence: "high",
  };
}
