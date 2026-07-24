/**
 * check:studio-structure 门禁自测（node:test）。
 * 夹具独立于 apps/studioV2 业务源码；覆盖 08§6 结构相关要点。
 */
import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  classifyFileKind,
  computeCyclomaticComplexity,
  countEffectiveLines,
  formatViolation,
  runStructureGate,
  validateAllowlist,
} from "../check-studio-structure.mjs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const fixturesRoot = path.join(__dirname, "fixtures", "structure");

async function gateFor(fixtureName) {
  const dir = path.join(fixturesRoot, fixtureName);
  return runStructureGate({
    studioRoot: path.relative(repoRoot, dir),
    configPath: path.join(dir, "structure-gate-config.json"),
  });
}

describe("check:studio-structure", () => {
  it("有效行数忽略空行但不忽略注释", () => {
    const text = "// note\n\nconst x = 1;\n\n";
    assert.equal(countEffectiveLines(text), 2);
  });

  it("page.tsx 分类正确", () => {
    assert.equal(classifyFileKind("apps/studioV2/app/page.tsx"), "page");
    assert.equal(
      classifyFileKind("apps/studioV2/src/pageComponents/home/WorkbenchShell.tsx"),
      "uiComponent",
    );
  });

  it("圈复杂度统计分支", () => {
    const src = "function f(x:number){ if(x){return 1;} if(x>1){return 2;} return 0;}";
    const sf = ts.createSourceFile("t.ts", src, ts.ScriptTarget.Latest, true);
    let fn = null;
    ts.forEachChild(sf, (n) => {
      if (ts.isFunctionDeclaration(n)) fn = n;
    });
    assert.ok(fn);
    assert.ok(computeCyclomaticComplexity(fn) >= 3);
  });

  it("合格基线通过，且排除 generated", async () => {
    const { errors, filesChecked } = await gateFor("pass-baseline");
    assert.equal(errors.length, 0);
    assert.equal(filesChecked, 1, "generated 目录应被排除");
  });

  it("page 行数硬上限失败", async () => {
    const { errors } = await gateFor("fail-page-lines");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-004"));
  });

  it("函数复杂度硬上限失败", async () => {
    const { errors } = await gateFor("fail-fn-complexity");
    assert.ok(
      errors.some(
        (v) =>
          v.ruleId === "STUDIO-STRUCT-003" || v.ruleId === "STUDIO-STRUCT-002",
      ),
    );
  });

  it("client 引擎写口失败", async () => {
    const { errors } = await gateFor("fail-engine-write");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-005"));
  });

  it("Client bis import type 引擎失败", async () => {
    const { errors } = await gateFor("fail-client-engine-type");
    assert.ok(
      errors.some(
        (v) =>
          v.ruleId === "STUDIO-STRUCT-005" &&
          v.message.includes("import type"),
      ),
    );
  });

  it("Server 倒引 Client bis 失败", async () => {
    const { errors } = await gateFor("fail-server-client-import");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-020"));
  });

  it("Client 引用 engineIOModule 失败", async () => {
    const { errors } = await gateFor("fail-client-engineiomodule");
    assert.ok(
      errors.some(
        (v) =>
          v.ruleId === "STUDIO-STRUCT-020" &&
          v.message.includes("Server-only"),
      ),
    );
  });

  it("Server 路径允许 import 引擎门面", async () => {
    const { errors } = await gateFor("pass-server-engine");
    assert.equal(errors.length, 0);
  });

  it("Server 路径允许 import engineIOModule", async () => {
    const { errors } = await gateFor("pass-server-engineiomodule");
    assert.equal(errors.length, 0);
  });

  it("业务旁平放测试失败", async () => {
    const { errors } = await gateFor("fail-colocated-test");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-007"));
  });

  it("深挖引擎内部路径失败", async () => {
    const { errors } = await gateFor("fail-deep-engine");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-006"));
  });

  it("目录异责平铺失败", async () => {
    const { errors } = await gateFor("fail-cluster");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-008"));
  });

  it("业务 barrel index 失败", async () => {
    const { errors } = await gateFor("fail-barrel");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-009"));
  });

  it("旧式顶层业务目录失败", async () => {
    const { errors } = await gateFor("fail-legacy-root");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-012"));
  });

  it("兼容转发壳失败", async () => {
    const { errors } = await gateFor("fail-compat-forward");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-013"));
  });

  it("同一语义区重复入口失败", async () => {
    const { errors } = await gateFor("fail-duplicate-entry");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-014"));
  });

  it("commonUiComponents 平铺组件失败", async () => {
    const { errors } = await gateFor("fail-common-ui-flat");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-016"));
  });

  it("新增或修改代码使用空格缩进失败", async () => {
    const { errors } = await gateFor("fail-entry-style");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-017"));
  });

  it("自定义组件引用缺少用途注释失败", async () => {
    const { errors } = await gateFor("fail-entry-style");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-018"));
  });

  it("组件 props 未在入口显式解构失败", async () => {
    const { errors } = await gateFor("fail-props-entry");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-019"));
  });

  it("入口格式合格通过", async () => {
    const { errors } = await gateFor("pass-entry-style");
    assert.equal(errors.length, 0);
  });

  it("UI 组件裸 fetch 失败", async () => {
    const { errors } = await gateFor("fail-bare-fetch");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-010"));
  });

  it("大范围豁免被拒绝", async () => {
    const { errors } = await gateFor("fail-broad-allowlist");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-011"));
  });

  it("精确豁免生效", async () => {
    const { errors } = await gateFor("pass-precise-allowlist");
    assert.equal(errors.length, 0);
  });

  it("validateAllowlist 拒绝 apps/**", () => {
    const violations = validateAllowlist({
      config: {
        allowlist: [
          {
            ruleId: "STUDIO-STRUCT-001",
            target: "apps/**",
            reason: "x",
            owner: "y",
            exitCondition: "z",
          },
        ],
      },
    });
    assert.ok(violations.some((v) => v.ruleId === "STUDIO-STRUCT-011"));
  });

  it("输出格式含规则编号与位置（路径可定位）", async () => {
    const { errors } = await gateFor("fail-page-lines");
    const line = formatViolation(errors[0]);
    assert.match(line, /^STUDIO-STRUCT-\d{3}\s+\S+:\d+:\d+\s+.+\s+.+/);
    // Windows/macOS/Linux：相对路径用 /
    assert.match(errors[0].file, /app\/page\.tsx$/);
  });

  it("UI 直引 stores/ajaxProxy 失败（STRUCT-021）", async () => {
    const { errors } = await gateFor("fail-ui-layering");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-021"));
  });

  it("stores import bis 失败（STRUCT-022）", async () => {
    const { errors } = await gateFor("fail-store-layering");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-022"));
  });

  it("非 shell bis import next/navigation 失败（STRUCT-023）", async () => {
    const { errors } = await gateFor("fail-bis-nav");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-023"));
  });

  it("bis value import UI 失败（STRUCT-024）", async () => {
    const { errors } = await gateFor("fail-bis-ui");
    assert.ok(errors.some((v) => v.ruleId === "STUDIO-STRUCT-024"));
  });
});
