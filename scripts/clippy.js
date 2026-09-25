#!/usr/bin/env node
/**
 * Dev/CLI helper: forwards to `npm run tauri -- dev` with extra args.
 * After `npm run clippy:build`, prefer the packaged binary named `clippy`.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

// Tauri: `tauri dev -- [runnerArgs] -- [appArgs]`
// The second `--` is required so --model/--ollama reach the binary, not cargo.
const child = spawn(
  "npm",
  ["run", "tauri", "--", "dev", "--", "--", ...args],
  {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
