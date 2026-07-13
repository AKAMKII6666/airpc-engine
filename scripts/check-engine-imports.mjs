/**
 * CI gate: packages/rpg-engine must not import react / next / @xyflow.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const engineRoot = path.join(root, "packages", "rpg-engine");

const FORBIDDEN = [
  /\bfrom\s+['"]react(?:-dom)?(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"]next(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"]@xyflow\/[^'"]+['"]/,
  /\bimport\s*\(\s*['"]react(?:-dom)?(?:\/[^'"]*)?['"]\s*\)/,
  /\bimport\s*\(\s*['"]next(?:\/[^'"]*)?['"]\s*\)/,
  /\bimport\s*\(\s*['"]@xyflow\/[^'"]+['"]\s*\)/,
  /\brequire\s*\(\s*['"]react(?:-dom)?(?:\/[^'"]*)?['"]\s*\)/,
  /\brequire\s*\(\s*['"]next(?:\/[^'"]*)?['"]\s*\)/,
  /\brequire\s*\(\s*['"]@xyflow\/[^'"]+['"]\s*\)/,
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const files = await walk(path.join(engineRoot, "src"));
const violations = [];

for (const file of files) {
  const text = await readFile(file, "utf8");
  for (const re of FORBIDDEN) {
    if (re.test(text)) {
      violations.push(`${path.relative(root, file)} matches ${re}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Engine import gate failed:");
  for (const v of violations) console.error(" -", v);
  process.exit(1);
}

console.log(`check:engine-imports ok (${files.length} files)`);
