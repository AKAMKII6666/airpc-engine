/**
 * Studio V2 统一质量入口（08§5.1 / §7）。
 * 汇总：ensure-modal-layout → ensure-migrated-layout → lint → typecheck → check:comments → check:studio-structure → test:studio → 门禁自测。
 *
 * ensure-* 须在 typecheck 之前：平铺空壳会导致 TS2306 / STRUCT-008/014，而结构门禁清理太晚。
 *
 * 用法：node scripts/studio-quality/quality-studio.mjs
 * 任一步非零退出即失败。
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureModalNestedLayout } from "./ensure-modal-layout.mjs";
import { ensureMigratedLayout } from "./ensure-migrated-layout.mjs";

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
  console.log("\n==> ensure-modal-layout (pre-typecheck)");
  const modalRemoved = ensureModalNestedLayout();
  console.log(
    modalRemoved === 0
      ? "ensure-modal-layout: nothing to remove"
      : `ensure-modal-layout: removed ${modalRemoved} file(s)`,
  );

  console.log("\n==> ensure-migrated-layout (pre-typecheck)");
  const migratedRemoved = ensureMigratedLayout();
  console.log(
    migratedRemoved === 0
      ? "ensure-migrated-layout: nothing to remove"
      : `ensure-migrated-layout: removed ${migratedRemoved} file(s)`,
  );

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
      console.error("\nquality:studio FAILED");
      process.exit(process.exitCode || 1);
    }
  }
  console.log("\nquality:studio ok");
}

main();
