import { Telegraf } from "telegraf";
import type { Express } from "express";
import { prisma } from "../prisma";
import { logger } from "../utils/logger";

let bot: Telegraf | null = null;
let botUsername: string | null = null;

export function setupTelegramWebhook(app: Express) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn("[TelegramBot] TELEGRAM_BOT_TOKEN not set, bot disabled");
    return;
  }

  bot = new Telegraf(token);

  bot.telegram.getMe().then((me) => {
    botUsername = me.username || null;
  }).catch(() => {});

  bot.start(async (ctx) => {
    try {
      const tokenParam = ctx.message.text.split(" ")[1];
      if (!tokenParam) {
        await ctx.reply("Добро пожаловать в Клуб «Всё дело в еде!» Используйте ссылку из приложения для привязки аккаунта.");
        return;
      }

      const user = await prisma.user.findFirst({
        where: { clubToken: tokenParam },
      });

      if (!user) {
        await ctx.reply("Ссылка устарела или недействительна. Запросите новую ссылку в приложении.");
        return;
      }

      if (!user.clubTokenExpiresAt || user.clubTokenExpiresAt < new Date()) {
        await ctx.reply("Срок действия ссылки истёк. Запросите новую ссылку в приложении.");
        return;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramId: String(ctx.from.id),
          telegramName: ctx.from.first_name || null,
          telegramUsername: ctx.from.username || null,
          clubLinkedAt: new Date(),
          clubToken: null,
          clubTokenExpiresAt: null,
        },
      });

      const inviteLink = process.env.TELEGRAM_GROUP_INVITE_LINK;
      if (inviteLink) {
        await ctx.reply(
          `Аккаунт успешно привязан, ${ctx.from.first_name || "друг"}! Добро пожаловать в Клуб «Всё дело в еде!»\n\nВступайте в чат: ${inviteLink}`,
          { link_preview_options: { is_disabled: true } }
        );
      } else {
        await ctx.reply("Аккаунт успешно привязан! Добро пожаловать в Клуб «Всё дело в еде!»");
      }
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
