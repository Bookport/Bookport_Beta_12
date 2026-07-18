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
    if (!botToken) {
      logger.warn("[InitData] TELEGRAM_BOT_TOKEN not set");
      return null;
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
