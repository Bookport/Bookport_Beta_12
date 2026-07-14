import { spawn } from "child_process";
import { createRequire } from "module";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { createServer } from "net";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const require = createRequire(import.meta.url);
const chokidar = require("chokidar");

const PORT = 3000;

let child = null;
let restartTimer = null;

function portFree(port, cb) {
  const server = createServer();
  server.once("error", () => cb(false));
  server.once("listening", () => {
    server.close();
    cb(true);
  });
  server.listen(port, "0.0.0.0");
}

function waitForPort(port, free, cb, attempts = 0) {
  portFree(port, (isFree) => {
    if (isFree === free || attempts > 20) return cb();
    setTimeout(() => waitForPort(port, free, cb, attempts + 1), 200);
  });
}

function startServer() {
  if (child) {
    child.kill("SIGTERM");
    child = null;
  }

  waitForPort(PORT, true, () => {
    child = spawn("npx", ["tsx", "server.ts"], {
      cwd: __dirname,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    child.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.log(`[watcher] Server exited with code ${code}`);
      }
      child = null;
    });
  });
}

function scheduleRestart() {
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    console.log(`\n[watcher] Change detected, restarting...\n`);
    if (child) {
      child.kill("SIGTERM");
      child = null;
    }
    startServer();
  }, 300);
}

const watchDirs = ["server.ts", "src", "prisma"];
const ignorePatterns = [
  /node_modules/,
  /\.git/,
  /logs/,
  /dist/,
  /\.vite-temp/,
];

const watcher = chokidar.watch(watchDirs, {
  cwd: __dirname,
  ignored: ignorePatterns,
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
});

watcher.on("change", (filePath) => {
  console.log(`[watcher] Changed: ${filePath}`);
  scheduleRestart();
});

watcher.on("add", (filePath) => {
  console.log(`[watcher] Added: ${filePath}`);
  scheduleRestart();
});

watcher.on("unlink", (filePath) => {
  console.log(`[watcher] Removed: ${filePath}`);
  scheduleRestart();
});

startServer();

process.on("SIGINT", () => {
  if (child) child.kill();
  watcher.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  if (child) child.kill();
  watcher.close();
  process.exit(0);
});

console.log("[watcher] Running. Watching: server.ts, src/, prisma/");
