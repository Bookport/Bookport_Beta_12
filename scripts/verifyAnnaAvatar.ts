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
