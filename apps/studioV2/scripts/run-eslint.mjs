/**
 * Workspace-safe ESLint entry: resolve the local eslint package via Node
 * module resolution (hoisted root or package-local), then forward argv.
 * Avoids `sh: eslint: command not found` when .bin is not on PATH.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
/** package.json is on eslint exports map; bin/eslint.js may not be. */
const eslintPkgJson = require.resolve("eslint/package.json");
const eslintBin = path.join(path.dirname(eslintPkgJson), "bin", "eslint.js");
const studioRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const args = process.argv.slice(2);

const result = spawnSync(process.execPath, [eslintBin, ...args], {
  cwd: studioRoot,
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
