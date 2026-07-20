import crypto from "crypto";
import { Telegraf } from "telegraf";
import type { Express } from "express";
import { prisma } from "../prisma";
import { logger } from "../utils/logger";
import { HttpsProxyAgent } from "https-proxy-agent";

let bot: Telegraf | null = null;
let botUsername: string | null = null;

export function setupTelegramWebhook(app: Express) {
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
        const purchaseToken = await prisma.purchaseToken.findUnique({
          where: { token: param },
        });

        if (!purchaseToken || purchaseToken.used || purchaseToken.expiresAt < new Date()) {
          await ctx.reply("Ссылка устарела или недействительна. Обратитесь в поддержку.");
          return;
        }

        const user = await prisma.user.upsert({
          where: { telegramId: String(ctx.from.id) },
          update: {
            telegramName: ctx.from.first_name || null,
            telegramUsername: ctx.from.username || null,
            purchasedAt: new Date(),
          },
          create: {
            id: crypto.randomUUID(),
            telegramId: String(ctx.from.id),
            telegramName: ctx.from.first_name || null,
            telegramUsername: ctx.from.username || null,
            purchasedAt: new Date(),
          },
        });

        await prisma.purchaseToken.update({
          where: { id: purchaseToken.id },
          data: { used: true, telegramId: String(ctx.from.id), usedAt: new Date() },
        });

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

  if (process.env.NODE_ENV === "production" && process.env.SERVER_URL) {
    const webhookUrl = `${process.env.SERVER_URL}/api/telegram-webhook`;
    bot.telegram.setWebhook(webhookUrl).then(() => {
      logger.info(`[TelegramBot] Webhook set to ${webhookUrl}`);
    }).catch((err) => {
      logger.error("[TelegramBot] Failed to set webhook", err);
    });
  } else {
    logger.info("[TelegramBot] Webhook mode disabled (dev environment)");
  }
}

export function getBot(): Telegraf | null {
  return bot;
}

export function getBotUsername(): string | null {
  return botUsername;
}
