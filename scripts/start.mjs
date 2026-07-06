#!/usr/bin/env node
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { homedir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = join(root, ".runtime");
const runtimeHome = join(runtimeRoot, "home");
const userDataDir = join(runtimeRoot, "userData");
const sessionDataDir = join(runtimeRoot, "session");
const npmCacheDir = process.env.npm_config_cache || join(homedir(), ".npm");
const platformScope = `${process.platform}-${process.arch}`;
const rgName = process.platform === "win32" ? "rg.exe" : "rg";
const rgPath = join(root, "bundled-tools", platformScope, "ripgrep", rgName);

for (const dir of [runtimeHome, userDataDir, sessionDataDir]) {
  mkdirSync(dir, { recursive: true });
}

const env = {
  ...process.env,
  HOME: runtimeHome,
  npm_config_cache: npmCacheDir,
  ZCODE_DATA_BASE_DIR: runtimeHome,
  ZCODE_DESKTOP_APPLICATION_NAME: "ZCode Parsed",
  ZCODE_DESKTOP_HOME_DIR: runtimeHome,
  ZCODE_DESKTOP_SESSION_DATA_DIR: sessionDataDir,
  ZCODE_DESKTOP_USER_DATA_DIR: userDataDir,
  ZCODE_DISABLE_FIXED_REMOTE_DEBUGGING_PORT: "1",
  ZCODE_REMOTE_ASSET_CACHE_DIR: join(userDataDir, "remote-assets-cache"),
  ZCODE_SERVER_RUNTIME_ROOT: root
};

if (process.platform === "win32") {
  env.USERPROFILE = runtimeHome;
}

if (existsSync(rgPath)) {
  env.ZCODE_RG_BINARY = rgPath;
}

const localElectron = process.platform === "win32"
  ? join(root, "node_modules", ".bin", "electron.cmd")
  : join(root, "node_modules", ".bin", "electron");

let command = process.env.ELECTRON_BINARY;
let args = [root];

if (!command && existsSync(localElectron)) {
  command = localElectron;
} else if (!command) {
  const electronVersion = process.env.ZCODE_ELECTRON_VERSION || "41.0.3";
  command = "npx";
  args = ["--yes", `electron@${electronVersion}`, root];
}

const child = spawn(command, args, {
  cwd: root,
  env,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
