import crypto from "crypto";
import { Telegraf } from "telegraf";
import type { Express } from "express";
import { prisma } from "../prisma";
import { logger } from "../utils/logger";
import { HttpsProxyAgent } from "https-proxy-agent";

let bot: Telegraf | null = null;
let botUsername: string | null = null;

// IS_PRODUCTION передаёт сервер: процесс сам о себе судить не может (см. server.ts, bootNodeEnv).
export function setupTelegramWebhook(app: Express, isProduction: boolean) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn("[TelegramBot] TELEGRAM_BOT_TOKEN not set, bot disabled");
    return;
  }

  const proxyUrl = process.env.RINGO_PROXY_URL;
  const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

  if (proxyUrl) {
    logger.info(`[TelegramBot] Using Ringo proxy: ${proxyUrl}`);
  }

  bot = new Telegraf(token, {
    telegram: { agent }
  });

  bot.telegram.getMe().then((me) => {
    botUsername = me.username || null;
  }).catch(() => {});

  bot.start(async (ctx) => {
    try {
      const param = ctx.message.text.split(" ")[1];

      // Purchase flow
      if (param && param.startsWith("purchase_")) {
        const telegramId = String(ctx.from.id);

        // Токен расходываем первым и в той же транзакции, что и пользователя:
        // updateMany с used=false — это одновременно проверка и захват. Раздельные
        // upsert + update давали окно, в котором прерванный процесс оставлял
        // пользователя с purchasedAt, но живой токен, и его тратил второй человек.
        const user = await prisma.$transaction(async (tx) => {
          const spent = await tx.purchaseToken.updateMany({
            where: { token: param, used: false, expiresAt: { gt: new Date() } },
            data: { used: true, telegramId, usedAt: new Date() },
          });
          if (spent.count !== 1) return null;

          return tx.user.upsert({
            where: { telegramId },
            update: {
              telegramName: ctx.from.first_name || null,
              telegramUsername: ctx.from.username || null,
              purchasedAt: new Date(),
            },
            create: {
              id: crypto.randomUUID(),
              telegramId,
              telegramName: ctx.from.first_name || null,
              telegramUsername: ctx.from.username || null,
              purchasedAt: new Date(),
            },
          });
        });

        if (!user) {
          await ctx.reply("Ссылка устарела или недействительна. Обратитесь в поддержку.");
          return;
        }

        const appUrl = process.env.SERVER_URL || "https://app.vsedelovede.ru";
        await ctx.reply(
          `Добро пожаловать, ${ctx.from.first_name || "друг"}! 🎉\n\nНажмите кнопку ниже, чтобы открыть приложение:`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: "🚀 Открыть приложение", web_app: { url: appUrl } }]],
            },
          }
        );
        return;
      }

      // Club stub
      await ctx.reply("Клуб скоро будет доступен.");
    } catch (err) {
      logger.error("[TelegramBot] /start error", err);
      await ctx.reply("Произошла ошибка. Попробуйте позже.").catch(() => {});
    }
  });

  bot.on("chat_join_request", async (ctx) => {
    try {
      const telegramId = String(ctx.chatJoinRequest.from.id);
      const user = await prisma.user.findUnique({
        where: { telegramId },
      });

      if (user) {
        await ctx.approveChatJoinRequest(ctx.chatJoinRequest.from.id);
        logger.info(`[TelegramBot] Approved join request for telegramId=${telegramId}`);
      } else {
        await ctx.declineChatJoinRequest(ctx.chatJoinRequest.from.id);
        logger.warn(`[TelegramBot] Declined join request for unknown telegramId=${telegramId}`);
      }
    } catch (err) {
      logger.error("[TelegramBot] chat_join_request error", err);
    }
  });

  app.use(bot.webhookCallback("/api/telegram-webhook"));

  if (isProduction && process.env.SERVER_URL) {
    const webhookUrl = `${process.env.SERVER_URL}/api/telegram-webhook`;
    bot.telegram.setWebhook(webhookUrl).then(() => {
      logger.info(`[TelegramBot] Webhook set to ${webhookUrl}`);
    }).catch((err) => {
      logger.error("[TelegramBot] Failed to set webhook", err);
    });
  } else {
    // Раньше здесь всегда писалось «dev environment», хотя причины две, и для прода они разные.
    logger.info(
      isProduction
        ? "[TelegramBot] Webhook НЕ зарегистрирован: не задан SERVER_URL — бот не получает обновления"
        : "[TelegramBot] Webhook mode disabled (dev environment)"
    );
  }
}

export function getBot(): Telegraf | null {
  return bot;
}

export function getBotUsername(): string | null {
  return botUsername;
}
