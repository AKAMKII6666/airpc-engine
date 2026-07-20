/**
 * 引擎统一质量入口（休整计划 §9.4）。
 * 汇总：check:engine-imports → typecheck → check:engine-structure → vitest → 门禁自测。
 *
 * 用法：node scripts/engine-quality/quality-engine.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  const steps = [
    [
      "check:engine-imports",
      "node",
      [path.join("scripts", "check-engine-imports.mjs")],
    ],
    [
      "typecheck (@airpc/rpg-engine)",
      "npm",
      ["run", "typecheck", "-w", "@airpc/rpg-engine"],
    ],
    [
      "check:engine-structure",
      "node",
      [path.join("scripts", "engine-quality", "check-engine-structure.mjs")],
    ],
    ["vitest (@airpc/rpg-engine)", "npm", ["run", "test", "-w", "@airpc/rpg-engine"]],
    [
      "gate self-tests (engine-structure)",
      "node",
      [
        "--test",
        path.join(
          "scripts",
          "engine-quality",
          "tests",
          "check-engine-structure.test.mjs",
        ),
      ],
    ],
  ];

  for (const [label, cmd, args] of steps) {
    if (!runStep(label, cmd, args)) {
      console.error("\nquality:engine FAILED");
      process.exit(process.exitCode || 1);
    }
  }
  console.log("\nquality:engine ok");
}

main();
