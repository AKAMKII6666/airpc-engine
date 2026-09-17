/**
 * Studio V2 统一质量入口（08§5.1 / §7）。
 * 汇总：lint → typecheck → check:comments → check:studio-structure → test:studio → 门禁自测。
 * 本命令只验证、不迁移；布局迁移必须显式执行 migrate:studio-layout。
 *
 * 用法：node scripts/studio-quality/quality-studio.mjs
 * 任一步非零退出即失败。
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertWorktreeUnchanged,
  captureWorktreeFingerprint,
} from "../quality/worktree-fingerprint.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

/**
 * @param {string} label
 * @param {string} command
 * @param {string[]} args
 */
function runStep(label, command, args) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.error) {
    console.error(result.error);
    process.exitCode = 1;
    return false;
  }
  if (result.status !== 0) {
    console.error(`${label} failed (exit ${result.status})`);
    process.exitCode = 1;
    return false;
  }
  return true;
}

function main() {
  const fingerprint = captureWorktreeFingerprint(repoRoot);

  const steps = [
    ["lint (@airpc/studio-v2)", "npm", ["run", "lint", "-w", "@airpc/studio-v2"]],
    [
      "typecheck (@airpc/studio-v2)",
      "npm",
      ["run", "typecheck", "-w", "@airpc/studio-v2"],
    ],
    [
      "check:comments",
      "node",
      [path.join("scripts", "studio-quality", "check-comments.mjs")],
    ],
    [
      "check:studio-structure",
      "node",
      [path.join("scripts", "studio-quality", "check-studio-structure.mjs")],
    ],
    ["test:studio", "npm", ["run", "test:studio"]],
    [
      "gate self-tests (comments + structure)",
      "node",
      [
        "--test",
        path.join("scripts", "studio-quality", "tests", "check-comments.test.mjs"),
        path.join(
          "scripts",
          "studio-quality",
          "tests",
          "check-studio-structure.test.mjs",
        ),
      ],
    ],
  ];

  for (const [label, cmd, args] of steps) {
    if (!runStep(label, cmd, args)) {
      assertWorktreeUnchanged(repoRoot, fingerprint, "quality:studio");
      console.error("\nquality:studio FAILED");
      return;
    }
  }
  assertWorktreeUnchanged(repoRoot, fingerprint, "quality:studio");
  console.log("\nquality:studio ok");
}

main();
