/**
 * 顺序执行 quality:studio 相关命令，将 COMMAND / EXIT_CODE / stdout / stderr 写入日志。
 * 用法：node scripts/run-quality-studio-log.mjs
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const logPath = path.join(repoRoot, ".quality-studio-run.log");

/** @param {string} commandLine */
function runLogged(commandLine) {
  const started = new Date().toISOString();
  const result = spawnSync(commandLine, {
    cwd: repoRoot,
    shell: true,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
  const exitCode = result.status ?? (result.error ? 1 : 0);
  const block = [
    "",
    "================================================================================",
    `COMMAND: ${commandLine}`,
    `STARTED: ${started}`,
    `EXIT_CODE: ${exitCode}`,
    "--- stdout ---",
    result.stdout ?? "",
    "--- stderr ---",
    result.stderr ?? (result.error ? String(result.error) : ""),
    `ENDED: ${new Date().toISOString()}`,
    "================================================================================",
    "",
  ].join("\n");
  appendFileSync(logPath, block, "utf8");
  return exitCode;
}

writeFileSync(
  logPath,
  `quality-studio-run log\nREPO: ${repoRoot}\nSTARTED: ${new Date().toISOString()}\n`,
  "utf8",
);

const installExit = runLogged("npm install -w @airpc/studio-v2");
if (installExit !== 0) {
  process.exit(installExit);
}

const qualityExit = runLogged("npm run quality:studio");
if (qualityExit !== 0) {
  const followUps = [
    "node scripts/studio-quality/check-studio-structure.mjs",
    "node --test scripts/studio-quality/tests/check-studio-structure.test.mjs",
    "npm run check:comments",
    "npm run lint -w @airpc/studio-v2",
    "npm run typecheck -w @airpc/studio-v2",
    "npm run test:studio",
  ];
  for (const cmd of followUps) {
    runLogged(cmd);
  }
  process.exit(qualityExit);
}

appendFileSync(
  logPath,
  `\nALL PASSED at ${new Date().toISOString()}\n`,
  "utf8",
);
