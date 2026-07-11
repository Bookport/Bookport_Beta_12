import fs from "fs";
import path from "path";
import { format } from "util";

const LOG_DIR = path.resolve(process.cwd(), "logs");

// Ensure logs directory exists
try {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {}

type LogLevel = "info" | "warn" | "error" | "debug";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL: number = (process.env.LOG_LEVEL as LogLevel)
  ? LOG_LEVELS[process.env.LOG_LEVEL as LogLevel]
  : LOG_LEVELS.info;

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 23);
}

function fileName(level: LogLevel): string {
  return path.join(LOG_DIR, `${level}.log`);
}

function writeToFile(level: LogLevel, message: string) {
  try {
    fs.appendFileSync(fileName(level), `${timestamp()} [${level.toUpperCase()}] ${message}\n`);
  } catch {}
}

function log(level: LogLevel, ...args: any[]) {
  if (LOG_LEVELS[level] < CURRENT_LEVEL) return;
  const message = format(...args);
  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
  const line = `${prefix} ${message}`;

  // Console output with colors
  switch (level) {
    case "error":
      console.error(`\x1b[31m${line}\x1b[0m`);
      break;
    case "warn":
      console.warn(`\x1b[33m${line}\x1b[0m`);
      break;
    case "info":
      console.log(`\x1b[36m${line}\x1b[0m`);
      break;
    default:
      console.log(line);
  }

  writeToFile(level, message);
}

export const logger = {
  debug: (...args: any[]) => log("debug", ...args),
  info: (...args: any[]) => log("info", ...args),
  warn: (...args: any[]) => log("warn", ...args),
  error: (...args: any[]) => log("error", ...args),

  // Structured request logger
  request: (method: string, url: string, status: number, durationMs: number, deviceId?: string) => {
    const tag = deviceId ? ` [device=${deviceId.slice(0, 8)}..]` : " [no-device]";
    log("info", `⇨ ${method} ${url} → ${status} (${durationMs}ms)${tag}`);
  },

  // AI call wrapper
  ai: (model: string, action: string, durationMs: number, success: boolean, error?: string) => {
    const icon = success ? "✓" : "✗";
    const err = error ? `: ${error.slice(0, 150)}` : "";
    log(success ? "info" : "error", `[AI] ${icon} ${model} / ${action} (${durationMs}ms)${err}`);
  },

  // DB call wrapper
  db: (action: string, durationMs: number, success: boolean, error?: string) => {
    const icon = success ? "✓" : "✗";
    const err = error ? `: ${error.slice(0, 150)}` : "";
    log(success ? "info" : "error", `[DB] ${icon} ${action} (${durationMs}ms)${err}`);
  },
};
