/**
 * check:comments 门禁自测（node:test）。
 * 夹具独立于 apps/studioV2 业务源码。
 */
import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  formatViolation,
  runCommentGate,
} from "../check-comments.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const fixturesRoot = path.join(__dirname, "fixtures", "comments");

async function gateFor(fixtureName) {
  const dir = path.join(fixturesRoot, fixtureName);
  return runCommentGate({
    studioRoot: path.relative(repoRoot, dir),
    configPath: path.join(dir, "comment-gate-config.json"),
  });
}

describe("check:comments", () => {
  it("合格契约通过", async () => {
    const { violations } = await gateFor("pass-contract");
    assert.equal(violations.length, 0);
  });

  it("缺失导出意图注释失败", async () => {
    const { violations } = await gateFor("fail-missing-export-doc");
    assert.ok(
      violations.some((v) => v.ruleId === "STUDIO-COMMENT-001"),
      formatViolation(violations[0] ?? { ruleId: "none", file: "", line: 0, column: 0, message: "none", suggestion: "" }),
    );
  });

  it("缺失字段说明失败", async () => {
    const { violations } = await gateFor("fail-missing-field-doc");
    assert.ok(violations.some((v) => v.ruleId === "STUDIO-COMMENT-002"));
  });

  it("复述占位注释失败", async () => {
    const { violations } = await gateFor("fail-placeholder-comment");
    assert.ok(violations.some((v) => v.ruleId === "STUDIO-COMMENT-004"));
  });

  it("无原因抑制失败（含裸 eslint-disable）", async () => {
    const { violations } = await gateFor("fail-suppress-no-reason");
    const suppressHits = violations.filter(
      (v) => v.ruleId === "STUDIO-COMMENT-003",
    );
    assert.ok(suppressHits.length >= 2, "应同时检出 eslint-disable 与 @ts-expect-error");
  });

  // 夹具 strictContractDirs=[]：只验有原因 suppress，不叠加严格契约导出注释
  it("带原因抑制通过", async () => {
    const { violations } = await gateFor("pass-suppress-with-reason");
    assert.equal(violations.length, 0);
  });

  it("输出格式含规则编号与位置", async () => {
    const { violations } = await gateFor("fail-missing-export-doc");
    const line = formatViolation(violations[0]);
    assert.match(line, /^STUDIO-COMMENT-\d{3}\s+\S+:\d+:\d+\s+.+\s+.+/);
  });
});
