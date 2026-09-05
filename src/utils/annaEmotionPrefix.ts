import {
  clampAnnaAvatarIntensity,
  type AnnaAvatarIntensity,
  type AnnaAvatarIntent,
} from "../types/annaAvatar";
import { planAvatarForAssistantReply } from "./annaAvatarPlanner";
import { normalizeAnnaAvatarIntent } from "./annaAvatarResolver";

export type AnnaEmotionPrefixSource =
  | "server_prefix"
  | "lexicon"
  | "fallback";

export interface ParsedAnnaEmotionReply {
  reply: string;
  avatarIntent: AnnaAvatarIntent;
  avatarIntensity: AnnaAvatarIntensity;
  source: AnnaEmotionPrefixSource;
  hadEmotionPrefix: boolean;
}

/**
 * Supported LLM response prefixes:
 *
 * `joy_user_success` (4)
 * joy_user_success (4)
 * JOY_USER_SUCCESS(4)
 * joy_user_success - 4
 * joy_user_success — 4
 *
 * The parser removes a prefix only when its intent normalizes to a real
 * manifest-backed canonical key. Unknown prefixes leave the reply intact.
 */
const PREFIX_PATTERNS: readonly RegExp[] = [
  /^[\t ]*`?([A-Za-z][A-Za-z0-9_-]*)`?[\t ]*\([\t ]*([1-6])[\t ]*\)[\t ]*(?:\r?\n+|$)/,
  /^[\t ]*`?([A-Za-z][A-Za-z0-9_-]*)`?[\t ]*[-–—:][\t ]*([1-6])[\t ]*(?:\r?\n+|$)/,
];

function fallbackReply(rawReply: string): ParsedAnnaEmotionReply {
  const reply = rawReply.trim();
  const selection = planAvatarForAssistantReply(reply);

  return {
    reply,
    avatarIntent: selection.intent,
    avatarIntensity: selection.intensity,
    source: selection.source === "lexicon" ? "lexicon" : "fallback",
    hadEmotionPrefix: false,
  };
}

export function parseAnnaEmotionReply(
  rawReply: string | null | undefined,
): ParsedAnnaEmotionReply {
  const raw = typeof rawReply === "string" ? rawReply : "";

  for (const pattern of PREFIX_PATTERNS) {
    const match = raw.match(pattern);

    if (!match) {
      continue;
    }

    const avatarIntent = normalizeAnnaAvatarIntent(match[1]);

    if (!avatarIntent) {
      return fallbackReply(raw);
    }

    const reply = raw.slice(match[0].length).trim();

    return {
      reply,
      avatarIntent,
      avatarIntensity: clampAnnaAvatarIntensity(match[2], 3),
      source: "server_prefix",
      hadEmotionPrefix: true,
    };
  }

  return fallbackReply(raw);
}
