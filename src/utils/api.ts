import { useAppStore } from "../store/useAppStore";
import { clientLogger } from "./clientLogger";

const DEVICE_ID_KEY = "wfpb_device_id";

function getDeviceId(): string {
  const fromStore = useAppStore.getState().deviceId;
  if (fromStore) return fromStore;
  const fromLs = localStorage.getItem(DEVICE_ID_KEY);
  if (fromLs) return fromLs;
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

export async function api<T = any>(
  path: string,
  options?: { method?: string; headers?: Record<string, string>; body?: any; signal?: AbortSignal }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Device-Id": getDeviceId(),
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
