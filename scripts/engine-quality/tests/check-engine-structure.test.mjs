/**
 * check:engine-structure 门禁自测（休整计划 §9.5）。
 */
import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  classifyEngineFile,
  collectFileMetrics,
  computeCyclomaticComplexity,
  countEffectiveLines,
  formatViolation,
  runEngineStructureGate,
  validateBaselineDoc,
} from "../check-engine-structure.mjs";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const fixturesRoot = path.join(__dirname, "fixtures");

const baseConfig = {
  excludeDirNames: ["node_modules", "dist"],
  thresholds: {
    source: { warnLines: 350, hardLines: 500 },
    host: { warnLines: 400, hardLines: 600 },
    test: { warnLines: 450, hardLines: 700 },
    function: { warnLines: 60, hardLines: 100 },
    complexity: { warn: 10, hard: 15 },
  },
};

async function gateFor(fixtureName, baselineName = "engine-quality-baseline.json") {
  const dir = path.join(fixturesRoot, fixtureName);
  const engineRoot = path.relative(repoRoot, dir).split(path.sep).join("/");
  let baseline = { files: [] };
  try {
    baseline = JSON.parse(
      await readFile(path.join(dir, baselineName), "utf8"),
    );
  } catch {
    /* empty baseline */
  }
  return runEngineStructureGate({
    engineRoot,
    config: { ...baseConfig, engineRoot },
    baseline,
  });
}

describe("check:engine-structure", () => {
  it("有效行数忽略空行", () => {
    assert.equal(countEffectiveLines("// a\n\nconst x = 1;\n"), 2);
  });

  it("host 文件分类", () => {
    assert.equal(
      classifyEngineFile(
        "packages/rpg-engine/src/host/createEngineHost.ts",
        "packages/rpg-engine",
      ),
      "host",
    );
    assert.equal(
      classifyEngineFile(
        "packages/rpg-engine/src/runtime/effectExecutor.ts",
        "packages/rpg-engine",
      ),
      "source",
    );
  });

  it("圈复杂度统计分支", () => {
    const src =
      "function f(x:number){ if(x){return 1;} if(x>1){return 2;} return 0;}";
    const sf = ts.createSourceFile("t.ts", src, ts.ScriptTarget.Latest, true);
    let fn = null;
    ts.forEachChild(sf, (n) => {
      if (ts.isFunctionDeclaration(n)) fn = n;
    });
    assert.ok(fn);
    assert.ok(computeCyclomaticComplexity(fn) >= 3);
  });

  it("新文件超过文件硬上限失败", async () => {
    const { errors } = await gateFor("fail-file-lines");
    assert.ok(errors.some((v) => v.ruleId === "ENGINE-STRUCT-001"));
  });

  it("新函数超过函数硬上限失败", async () => {
    const { errors } = await gateFor("fail-fn-lines");
    assert.ok(errors.some((v) => v.ruleId === "ENGINE-STRUCT-002"));
  });

  it("圈复杂度超过硬上限失败", async () => {
    const { errors } = await gateFor("fail-complexity");
    assert.ok(errors.some((v) => v.ruleId === "ENGINE-STRUCT-003"));
  });

  it("历史超限文件保持基线通过", async () => {
    const { errors } = await gateFor("pass-baseline");
    assert.equal(
      errors.filter((e) => e.ruleId === "ENGINE-STRUCT-007").length,
      0,
    );
    assert.equal(
      errors.filter((e) => e.ruleId === "ENGINE-STRUCT-001").length,
      0,
    );
  });

  it("历史文件增加一行失败", async () => {
    const { errors } = await gateFor("fail-baseline-growth");
    assert.ok(
      errors.some(
        (v) =>
          v.ruleId === "ENGINE-STRUCT-007" &&
          String(v.message).includes("effectiveLines"),
      ),
    );
  });

  it("大目录基线通配被拒绝", async () => {
    const { errors } = await gateFor("fail-broad-baseline");
    assert.ok(errors.some((v) => v.ruleId === "ENGINE-STRUCT-008"));
  });

  it("src 平放测试失败", async () => {
    const { errors } = await gateFor("fail-colocated");
    assert.ok(errors.some((v) => v.ruleId === "ENGINE-STRUCT-004"));
  });

  it("无理由 suppress 失败", async () => {
    const { errors } = await gateFor("fail-suppress");
    assert.ok(errors.some((v) => v.ruleId === "ENGINE-STRUCT-006"));
  });

  it("合格小文件通过", async () => {
    const { errors } = await gateFor("pass-tiny");
    assert.equal(errors.length, 0);
  });

  it("validateBaselineDoc 拒绝通配", () => {
    const violations = validateBaselineDoc({
      files: [
        {
          file: "packages/**",
          effectiveLines: 1,
          maxFnLines: 1,
          maxComplexity: 1,
          reason: "x",
          owner: "y",
          recordedAt: "2026-07-16",
          exitCondition: "z",
        },
      ],
    });
    assert.ok(violations.some((v) => v.ruleId === "ENGINE-STRUCT-008"));
  });

  it("输出格式可被 path:line:col 解析", async () => {
    const { errors } = await gateFor("fail-file-lines");
    const line = formatViolation(errors[0]);
    assert.match(line, /^ENGINE-STRUCT-\d{3}\s+\S+:\d+:\d+\s+/);
    assert.match(line, /当前=/);
    assert.match(line, /允许=/);
  });

  it("真实引擎包在基线下可过结构门禁", async () => {
    const { errors, filesChecked } = await runEngineStructureGate({});
    assert.ok(filesChecked > 10);
    assert.equal(
      errors.length,
      0,
      errors.map(formatViolation).join("\n"),
    );
  });
});
