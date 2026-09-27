import { clientLogger } from "./clientLogger";
import { getTelegramInitData } from "./telegramClient";

export const API_TIMEOUT_MS = 20000;

// Сервер ждёт модель 60 с за попытку и делает вторую (src/services/llmAdapter.ts:7),
// а /api/anna-chat делает такие обращения последовательно (server.ts:1041, 1091).
// У этих путей ответ легально занимает десятки секунд: общий короткий интервал
// отрезал бы «Анну» и разбор блюда вместо зависшего экрана.
export const LLM_TIMEOUT_MS = 120000;

const LLM_ENDPOINTS = new Set([
  "/api/anna-chat",
  "/api/anna-supports",
  "/api/anna-sarcastic-reply",
  "/api/anna-comment",
  "/api/analyze-dish",
  "/api/analyze-image",
  "/api/transcribe-audio",
]);

export function timeoutFor(path: string): number {
  return LLM_ENDPOINTS.has(path.split("?")[0]) ? LLM_TIMEOUT_MS : API_TIMEOUT_MS;
}

export interface TimeoutHandle {
  signal: AbortSignal;
  isTimeout: () => boolean;
}

// AbortSignal.timeout() и AbortSignal.any() новее целевых браузеров сборки
// (vite по умолчанию целится в chrome87/safari14), поэтому контроллер собирается вручную.
export function withTimeout(ms: number, external?: AbortSignal): TimeoutHandle {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  const abort = () => controller.abort();
  if (external) {
    if (external.aborted) abort();
    else external.addEventListener("abort", abort, { once: true });
  }
  controller.signal.addEventListener(
    "abort",
    () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", abort);
    },
    { once: true }
  );
  return { signal: controller.signal, isTimeout: () => timedOut };
}

// Для мест, которым нужен только signal (классифицировать ошибку они не собираются).
export function timeoutSignal(ms: number, external?: AbortSignal): AbortSignal {
  return withTimeout(ms, external).signal;
}

export async function api<T = any>(
  path: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    signal?: AbortSignal;
    timeoutMs?: number;
  }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Telegram-Init-Data": getTelegramInitData(),
  };

  const timeoutMs = options?.timeoutMs ?? timeoutFor(path);
  const attempt = withTimeout(timeoutMs, options?.signal);

  const fetchOptions: RequestInit = {
    method: options?.method || "GET",
    headers: {
      ...headers,
      ...options?.headers,
    },
    signal: attempt.signal,
  };

  if (options?.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(path, fetchOptions);
  } catch (err: any) {
    let msg: string;
    if (attempt.isTimeout()) {
      msg = `Timeout after ${timeoutMs / 1000}s: ${path}`;
    } else if (attempt.signal.aborted) {
      msg = `Aborted: ${path}`;
    } else {
      msg = `Network error: ${err?.message || "fetch failed"}`;
    }
    clientLogger.error(msg, err, { source: "api", url: path });
    throw new Error(msg);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    clientLogger.apiError(path, response.status, text);
    // Серверские 401/403 несут человекочитаемый `error` (и для отказа доступа — `siteUrl`).
    // Без этих полей вызывающий код видит только `API 403: {"error":"…"}` и не может
    // отличить отказ доступа от сетевой ошибки — см. экран отказа в App.tsx (этап 1.12).
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    const err: any = new Error(`API ${response.status}: ${text.slice(0, 200)}`);
    err.status = response.status;
    if (typeof parsed?.error === "string") err.serverError = parsed.error;
    if (typeof parsed?.siteUrl === "string") err.siteUrl = parsed.siteUrl;
    throw err;
  }

  return response.json();
}

export function apiUrl(path: string): string {
  return path;
}
