import { existsSync } from "node:fs";
import { parseAnnaEmotionReply } from "../src/utils/annaEmotionPrefix";
import { avatarManifest } from "../src/assets/images/anna/anna-manifest";
import {
  clampAnnaAvatarIntensity,
  ANNA_AVATAR_INTENTS,
  type AnnaAvatarIntent,
} from "../src/types/annaAvatar";
import {
  planAnnaAvatar,
  planAvatarForAssistantReply,
  planAvatarForExplicitIntent,
  planAvatarForUiState,
  planAvatarForUserInput,
} from "../src/utils/annaAvatarPlanner";
import {
  normalizeAnnaAvatarIntent,
  resolveAvatar,
  resolveAvatarByState,
  resolveAvatarForCompliance,
  resolveAvatarForIntent,
  resolveAvatarForTab,
  resolveAvatarForUiState,
} from "../src/utils/annaAvatarResolver";

const failures: string[] = [];
let passed = 0;

function assert(
  condition: unknown,
  message: string,
): void {
  if (condition) {
    passed += 1;
    return;
  }

  failures.push(message);
}

function assertEqual<T>(
  actual: T,
  expected: T,
  label: string,
): void {
  assert(
    actual === expected,
    `${label}: expected ${String(expected)}, received ${String(actual)}`,
  );
}

function assertManifestIntent(
  intent: AnnaAvatarIntent,
  label: string,
): void {
  assert(
    Boolean(avatarManifest.series[intent]),
    `${label}: "${intent}" is absent from anna-manifest.ts`,
  );
}

console.log("========== Anna avatar verification ==========");

// 1. Canonical contract and manifest must remain aligned.
assertEqual(
  ANNA_AVATAR_INTENTS.length,
  63,
  "Canonical intent count",
);

for (const intent of ANNA_AVATAR_INTENTS) {
  assertManifestIntent(intent, "Canonical intent");
}

// 2. Intensity must always be safe for layer-based WebP output.
assertEqual(clampAnnaAvatarIntensity(-10), 1, "Clamp negative intensity");
assertEqual(clampAnnaAvatarIntensity(0), 1, "Clamp zero intensity");
assertEqual(clampAnnaAvatarIntensity(2.6), 3, "Round fractional intensity");
assertEqual(clampAnnaAvatarIntensity(99), 6, "Clamp excessive intensity");
assertEqual(clampAnnaAvatarIntensity(undefined), 3, "Fallback intensity");

// 3. UI states must be deterministic and manifest-backed.
for (const state of [
  "На связи",
  "Слушаю",
  "Думаю",
  "Отвечаю",
  "Занята",
  "Нет в сети",
] as const) {
  const selection = planAvatarForUiState(state);

  assertEqual(selection.source, "ui_state", `UI source for "${state}"`);
  assertEqual(selection.confidence, "high", `UI confidence for "${state}"`);
  assertManifestIntent(selection.intent, `UI state "${state}"`);
}

// 4. User input must receive supportive, non-punitive preliminary reactions.
const relapse = planAvatarForUserInput(
  "Я опять сорвалась и съела слишком много сладкого",
);
assertEqual(relapse.intent, "affirmation", "Relapse support intent");
assertEqual(relapse.intensity, 2, "Relapse support intensity");

const anxiety = planAvatarForUserInput(
  "Мне тревожно, я боюсь, что не справлюсь",
);
assertEqual(anxiety.intent, "understanding_nuances", "Anxiety intent");

const success = planAvatarForUserInput(
  "Я выдержала неделю и не сорвалась",
);
assertEqual(success.intent, "joy_user_success", "User success intent");

const neutralFoodQuestion = planAvatarForUserInput(
  "Хочу поесть сыр, какие есть растительные альтернативы?",
);
assertEqual(
  neutralFoodQuestion.intent,
  "curiosity",
  "Neutral food question must not be treated as dish violation",
);

// 5. Assistant reply fallback must be scoped independently from user input.
const supportiveReply = planAvatarForAssistantReply(
  "Ты ничего не испортила: один эпизод не отменяет весь путь.",
);
assertEqual(
  supportiveReply.intent,
  "affirmation",
  "Supportive assistant reply intent",
);

const dishReply = planAvatarForAssistantReply(
  "В этом составе есть несколько нарушений WFPB.",
  "dish_analysis",
);
assertEqual(
  dishReply.intent,
  "irritation_and_anger",
  "Dish violation reply intent",
);

const waterReply = planAvatarForAssistantReply(
  "Остался один стакан — ты почти у цели.",
  "water",
);
assertEqual(
  waterReply.intent,
  "cheerful_approval",
  "Water near-goal reply intent",
);

const movementReply = planAvatarForAssistantReply(
  "Цель по движению выполнена — отличный результат.",
  "movement",
);
assertEqual(
  movementReply.intent,
  "success",
  "Movement completed-goal reply intent",
);

// 6. Explicit module selections must be clamped and manifest-backed.
const explicit = planAvatarForExplicitIntent("mockery", 99);
assertEqual(explicit.intent, "mockery", "Explicit intent");
assertEqual(explicit.intensity, 6, "Explicit intensity clamp");
assertManifestIntent(explicit.intent, "Explicit selection");

// 7. Generic planner fallback must remain deterministic.
const fallback = planAnnaAvatar({
  scope: "measurements",
  text: "",
});
assertEqual(
  fallback.intent,
  "clear_explanation",
  "Measurements fallback intent",
);
assertEqual(fallback.confidence, "fallback", "Measurements fallback confidence");
assertManifestIntent(fallback.intent, "Measurements fallback");


// 8. Legacy aliases must map to physical snake_case manifest keys.
const aliasCases: ReadonlyArray<readonly [string, AnnaAvatarIntent]> = [
  ["joyandadmiration", "joy_and_admiration"],
  ["joy_user_success", "joy_user_success"],
  ["clearexplanation", "clear_explanation"],
  ["importantwarning", "important_warning"],
  ["irritationandanger", "irritation_and_anger"],
  ["anna_screaming", "anna_screaming"],
  ["warm_encouragement", "affirmation"],
];

for (const [rawIntent, expectedIntent] of aliasCases) {
  assertEqual(
    normalizeAnnaAvatarIntent(rawIntent),
    expectedIntent,
    `Alias "${rawIntent}"`,
  );
  assertManifestIntent(
    normalizeAnnaAvatarIntent(rawIntent) ?? "thoughtful",
    `Alias manifest target "${rawIntent}"`,
  );
}

// 9. Resolver must build paths from actual manifest sourceDir values.
const legacyResolverResult = resolveAvatar({
  toneGroup: "neutralthoughtful",
  intent: "clearexplanation",
  intensity: 3,
});

assertEqual(
  legacyResolverResult.key,
  "clear_explanation",
  "Legacy resolver canonical key",
);
assertEqual(
  legacyResolverResult.src,
  "/anna/clear_explanation/3.webp",
  "Legacy resolver WebP path",
);
assertEqual(
  legacyResolverResult.toneGroup,
  "neutral_thoughtful",
  "Legacy tone group normalization",
);

const canonicalResolverResult = resolveAvatarForIntent(
  "joy_user_success",
  4,
);

assertEqual(
  canonicalResolverResult.key,
  "joy_user_success",
  "Canonical resolver key",
);
assertEqual(
  canonicalResolverResult.src,
  "/anna/joy_user_success/4.webp",
  "Canonical resolver WebP path",
);
assertManifestIntent(
  canonicalResolverResult.key,
  "Canonical resolver manifest target",
);

const unknownResolverResult = resolveAvatar({
  toneGroup: "positive",
  intent: "not_a_real_avatar",
  intensity: 2,
});

assertEqual(
  unknownResolverResult.key,
  "affirmation",
  "Unknown intent positive fallback",
);
assertEqual(
  unknownResolverResult.src,
  "/anna/affirmation/2.webp",
  "Unknown intent fallback WebP path",
);

// 10. Resolver UI state and legacy state wrapper must remain valid.
const resolverThinking = resolveAvatarForUiState("Думаю");
assertEqual(resolverThinking.key, "thoughtful_v1", "Resolver thinking key");
assertEqual(
  resolverThinking.src,
  "/anna/thoughtful_v1/3.webp",
  "Resolver thinking WebP path",
);

const legacyThinking = resolveAvatarByState(
  "Думаю",
  "Я опять сорвалась и съела слишком много сладкого",
);
assertEqual(
  legacyThinking.key,
  "affirmation",
  "Legacy thinking state uses user-input planner",
);

const legacyAnswering = resolveAvatarByState(
  "Отвечаю",
  "Ты ничего не испортила: один эпизод не отменяет весь путь.",
);
assertEqual(
  legacyAnswering.key,
  "affirmation",
  "Legacy answering state uses assistant-reply planner",
);

// 11. Every StateNow base tab must have an existing manifest-backed series.
for (const tabId of [
  "balance",
  "scales",
  "kbju",
  "micro",
  "composition",
  "dynamics",
] as const) {
  const tabAvatar = resolveAvatarForTab(tabId);

  assertManifestIntent(tabAvatar.key, `StateNow tab "${tabId}"`);
  assert(
    /^\/anna\/[a-z0-9_]+\/[1-6]\.webp$/.test(tabAvatar.src),
    `StateNow tab "${tabId}" has an invalid WebP path: ${tabAvatar.src}`,
  );
}

// 12. WFPB compliance reaction must be deterministic and render-order independent.
const cleanCompliance = resolveAvatarForCompliance(0, 5);
assertEqual(
  cleanCompliance.key,
  "cheerful_approval",
  "Clean WFPB compliance intent",
);

const oneViolation = resolveAvatarForCompliance(1, 5);
assertEqual(
  oneViolation.key,
  "important_reminder",
  "Single WFPB violation intent",
);

const repeatedFirst = resolveAvatarForCompliance(3, 5);
const unrelatedCall = resolveAvatarForCompliance(0, 1);
const repeatedSecond = resolveAvatarForCompliance(3, 5);

assertEqual(
  repeatedFirst.key,
  repeatedSecond.key,
  "WFPB result must not depend on prior calls",
);
assertEqual(
  repeatedFirst.level,
  repeatedSecond.level,
  "WFPB intensity must not depend on prior calls",
);
assertManifestIntent(
  repeatedFirst.key,
  "WFPB repeated result manifest target",
);
assertManifestIntent(
  unrelatedCall.key,
  "WFPB unrelated result manifest target",
);


// 13. Every canonical manifest series must have all six public WebP layers.
// This validates the exact browser URL contract: /anna/<intent>/<level>.webp.
for (const intent of ANNA_AVATAR_INTENTS) {
  for (const level of [1, 2, 3, 4, 5, 6] as const) {
    const avatar = resolveAvatarForIntent(intent, level);
    const publicFilePath = `public${avatar.src}`;

    assert(
      existsSync(publicFilePath),
      `Missing public avatar asset: ${publicFilePath}`,
    );
  }
}


// 14. LLM emotion prefix parser: valid formats, aliases and safe fallbacks.
const canonicalPrefix = parseAnnaEmotionReply(
  "`joy_user_success` (4)\nТы отлично справилась с этим шагом.",
);
assertEqual(
  canonicalPrefix.reply,
  "Ты отлично справилась с этим шагом.",
  "Canonical prefix reply cleanup",
);
assertEqual(
  canonicalPrefix.avatarIntent,
  "joy_user_success",
  "Canonical prefix intent",
);
assertEqual(
  canonicalPrefix.avatarIntensity,
  4,
  "Canonical prefix intensity",
);
assertEqual(
  canonicalPrefix.source,
  "server_prefix",
  "Canonical prefix source",
);
assertEqual(
  canonicalPrefix.hadEmotionPrefix,
  true,
  "Canonical prefix detection",
);

const noBackticksPrefix = parseAnnaEmotionReply(
  "clear_explanation (3)\nДавай разберёмся по шагам.",
);
assertEqual(
  noBackticksPrefix.reply,
  "Давай разберёмся по шагам.",
  "Plain prefix reply cleanup",
);
assertEqual(
  noBackticksPrefix.avatarIntent,
  "clear_explanation",
  "Plain prefix intent",
);

const legacyAliasPrefix = parseAnnaEmotionReply(
  "`clearexplanation` (2)\nВот в чём смысл.",
);
assertEqual(
  legacyAliasPrefix.avatarIntent,
  "clear_explanation",
  "Legacy prefix alias normalization",
);
assertEqual(
  legacyAliasPrefix.avatarIntensity,
  2,
  "Legacy prefix intensity",
);

const warmAliasPrefix = parseAnnaEmotionReply(
  "warm_encouragement (2)\nОдин эпизод не отменяет твой путь.",
);
assertEqual(
  warmAliasPrefix.avatarIntent,
  "affirmation",
  "Warm encouragement alias normalization",
);
assertEqual(
  warmAliasPrefix.source,
  "server_prefix",
  "Warm encouragement source",
);

const dashPrefix = parseAnnaEmotionReply(
  "important_warning — 5\nЭтот момент лучше не игнорировать.",
);
assertEqual(
  dashPrefix.reply,
  "Этот момент лучше не игнорировать.",
  "Dash prefix reply cleanup",
);
assertEqual(
  dashPrefix.avatarIntent,
  "important_warning",
  "Dash prefix intent",
);
assertEqual(
  dashPrefix.avatarIntensity,
  5,
  "Dash prefix intensity",
);

const invalidPrefix = parseAnnaEmotionReply(
  "`invented_emotion` (4)\nЭтот prefix не должен быть удалён.",
);
assertEqual(
  invalidPrefix.reply,
  "`invented_emotion` (4)\nЭтот prefix не должен быть удалён.",
  "Invalid prefix preserves complete reply",
);
assertEqual(
  invalidPrefix.hadEmotionPrefix,
  false,
  "Invalid prefix is not accepted",
);
assertEqual(
  invalidPrefix.avatarIntent,
  "clear_explanation",
  "Invalid prefix safe fallback",
);

const plainSupportiveReply = parseAnnaEmotionReply(
  "Ты ничего не испортила: один эпизод не отменяет весь путь.",
);
assertEqual(
  plainSupportiveReply.hadEmotionPrefix,
  false,
  "Plain reply has no prefix",
);
assertEqual(
  plainSupportiveReply.avatarIntent,
  "affirmation",
  "Plain supportive reply lexicon fallback",
);
assertEqual(
  plainSupportiveReply.source,
  "lexicon",
  "Plain supportive reply lexicon source",
);

const emptyReply = parseAnnaEmotionReply("");
assertEqual(emptyReply.reply, "", "Empty reply remains empty");
assertEqual(
  emptyReply.avatarIntent,
  "clear_explanation",
  "Empty reply safe intent fallback",
);
assertEqual(
  emptyReply.source,
  "fallback",
  "Empty reply fallback source",
);

if (failures.length > 0) {
  console.error(`\nFAILED: ${failures.length} assertion(s)`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`\nPASSED: ${passed} assertion(s)`);
  console.log(`Manifest series: ${avatarManifest.totalSeries}`);
  console.log("Anna avatar engine verification completed successfully.");
}
