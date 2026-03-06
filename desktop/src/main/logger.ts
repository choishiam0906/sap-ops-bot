import pino from "pino";
import { app } from "electron";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

function getLogPath(): string {
  try {
    const logDir = join(app.getPath("userData"), "logs");
    mkdirSync(logDir, { recursive: true });
    return join(logDir, "sap-ops-bot.log");
  } catch {
    return "sap-ops-bot.log";
  }
}

const isDev = !app.isPackaged;

const logger = pino({
  level: isDev ? "debug" : "info",
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
    : { target: "pino/file", options: { destination: getLogPath() } },
});

export { logger };
