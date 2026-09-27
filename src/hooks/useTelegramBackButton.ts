import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

// Аппаратная «назад» в Telegram Mini App закрывает приложение целиком, если
// BackButton не показан: Telegram не спрашивает клиента, есть ли куда возвращаться.
export function useTelegramBackButton() {
  const depth = useAppStore((s) => s.screenHistory.length);

  useEffect(() => {
    const button = window.Telegram?.WebApp?.BackButton;
    if (!button) return;
    if (depth > 0) button.show();
    else button.hide();
  }, [depth]);

  useEffect(() => {
    const button = window.Telegram?.WebApp?.BackButton;
    if (!button) return;
    const onClick = () => useAppStore.getState().back();
    button.onClick(onClick);
    return () => button.offClick(onClick);
  }, []);
}
