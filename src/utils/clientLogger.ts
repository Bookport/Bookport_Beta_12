const API_URL = ""; // relative path, same origin

export interface ClientLogEntry {
  level: "info" | "warn" | "error";
  message: string;
  source: string;
  timestamp: string;
  url?: string;
  status?: number;
  stack?: string;
  deviceId?: string;
}

function getDeviceId(): string {
  try {
    return localStorage.getItem("wfpb_device_id") || "unknown";
  } catch {
    return "unknown";
  }
}

function sendToServer(entry: ClientLogEntry) {
  try {
    const payload = JSON.stringify(entry);
    // Fire-and-forget — don't block the main flow
    fetch(`${API_URL}/api/logs/client`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Id": getDeviceId() },
      body: payload,
    }).catch(() => {}); // suppress network errors for the logger itself
  } catch {}
}

export const clientLogger = {
  info: (message: string, meta?: { source?: string; url?: string; status?: number }) => {
    const entry: ClientLogEntry = {
      level: "info",
      message,
      source: meta?.source || "client",
      timestamp: new Date().toISOString(),
      url: meta?.url,
      status: meta?.status,
      deviceId: getDeviceId(),
    };
    if (process.env.NODE_ENV !== "production") console.log(`[CLIENT] ${message}`, meta || "");
  },

  warn: (message: string, meta?: { source?: string; url?: string; status?: number }) => {
    const entry: ClientLogEntry = {
      level: "warn",
      message,
      source: meta?.source || "client",
      timestamp: new Date().toISOString(),
      url: meta?.url,
      status: meta?.status,
      deviceId: getDeviceId(),
    };
    console.warn(`[CLIENT] ⚠ ${message}`, meta || "");
    sendToServer(entry);
  },

  error: (message: string, error?: any, meta?: { source?: string; url?: string }) => {
    const entry: ClientLogEntry = {
      level: "error",
      message,
      source: meta?.source || "client",
      timestamp: new Date().toISOString(),
      url: meta?.url,
      stack: error?.stack || (typeof error === "string" ? error : undefined),
      deviceId: getDeviceId(),
    };
    console.error(`[CLIENT] ✗ ${message}`, error || "", meta || "");
    sendToServer(entry);
  },

  // Convenience wrapper for failed API calls
  apiError: (path: string, status: number, body: string, error?: any) => {
    clientLogger.error(`API ${status} ${path}: ${body.slice(0, 200)}`, error, {
      source: "api",
      url: path,
    });
  },
};
