import { clientLogger } from "./clientLogger";
import { getTelegramInitData } from "./telegramClient";

export async function api<T = any>(
  path: string,
  options?: { method?: string; headers?: Record<string, string>; body?: any; signal?: AbortSignal }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Telegram-Init-Data": getTelegramInitData(),
  };

  const fetchOptions: RequestInit = {
    method: options?.method || "GET",
    headers: {
      ...headers,
      ...options?.headers,
    },
    signal: options?.signal,
  };

  if (options?.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(path, fetchOptions);
  } catch (err: any) {
    const msg = `Network error: ${err?.message || "fetch failed"}`;
    clientLogger.error(msg, err, { source: "api", url: path });
    throw new Error(msg);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    clientLogger.apiError(path, response.status, text);
    throw new Error(`API ${response.status}: ${text.slice(0, 200)}`);
  }

  return response.json();
}

export function apiUrl(path: string): string {
  return path;
}
