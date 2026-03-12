import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDir, "..");

const electronBinary = process.platform === "win32"
  ? join(projectRoot, "node_modules", "electron", "dist", "electron.exe")
  : join(projectRoot, "node_modules", ".bin", "electron");

if (!existsSync(electronBinary)) {
  console.error(`Electron binary not found: ${electronBinary}`);
  process.exit(1);
}

const env = { ...process.env };
delete env.NODE_OPTIONS;

const child = spawn(electronBinary, ["."], {
  cwd: projectRoot,
  env,
  stdio: "inherit",
  windowsHide: false,
});

child.on("error", (error) => {
  console.error("Failed to start Electron:", error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
