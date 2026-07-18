import crypto from "crypto";
import { logger } from "./logger";

export interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

export function extractTelegramUser(initData: string): TelegramUser | null {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // In production, bot token is required for HMAC validation
    if (!botToken) {
      if (process.env.NODE_ENV === "production") {
        logger.error("[InitData] TELEGRAM_BOT_TOKEN not set in production!");
        return null;
      }
      // Dev fallback: parse user without hash validation
      logger.warn("[InitData] TELEGRAM_BOT_TOKEN not set — dev mode skip validation");
      const params = new URLSearchParams(initData);
      const userStr = params.get("user");
      if (!userStr) return null;
      return JSON.parse(userStr) as TelegramUser;
    }

    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    const dataCheckString = [...params.entries()]
      .filter(([k]) => k !== "hash")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (computedHash !== hash) {
      logger.warn("[InitData] Hash mismatch — invalid initData");
      return null;
    }

    const userStr = params.get("user");
    if (!userStr) return null;

    const user: TelegramUser = JSON.parse(userStr);
    if (!user.id) return null;

    return user;
  } catch (err) {
    logger.error("[InitData] Validation failed", err);
    return null;
  }
}
