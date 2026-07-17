import { useMemo } from "react";

export interface TelegramInfo {
  tg: TelegramWebApp | null;
  user: TelegramWebAppUser | null;
  initData: string;
  expand: () => void;
}

export function useTelegram(): TelegramInfo {
  return useMemo(() => {
    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp ?? null : null;

    return {
      tg,
      user: tg?.initDataUnsafe?.user ?? null,
      initData: tg?.initData ?? "",
      expand: () => {
        try {
          tg?.expand();
        } catch {
          // Telegram WebApp not available
        }
      },
    };
  }, []);
}
