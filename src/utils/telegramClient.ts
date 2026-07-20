export function getTelegramInitData(): string {
  if (typeof window === "undefined") return "";
  const data = (window as any).Telegram?.WebApp?.initData;
  if (!data && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "test-auth";
  }
  return data || "";
}
