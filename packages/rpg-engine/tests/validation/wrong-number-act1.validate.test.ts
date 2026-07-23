/**
 * 模块名称：wrong_number_act1 validatePackage 回归（S8-3 · 路径 B 空 participants）
 *
 * V2-VM-10：样例已迁 cardKind=voicemail + attach；validate 须绿（无 VOICEMAIL_* blocking）。
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createEngineHost, hasBlockingErrors } from "../../src/index.js";
import { createFsContentPort } from "../helpers/fsContentPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("validatePackage wrong_number_act1 (S8-3 / V2-VM-10)", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("omitted participants ok；迁移后无 create_voicemail / mode 错误", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-val-wna-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: false, content: createFsContentPort() });
    await host.loadWorkspace(dataRoot);
    const report = await host.validatePackage("wrong_number_act1");
    expect(
      report.warnings.some((e) => e.ruleId === "PARTICIPANT_UNKNOWN"),
    ).toBe(false);
    expect(
      report.errors.some((e) => e.ruleId.startsWith("VOICEMAIL_")),
    ).toBe(false);
    expect(hasBlockingErrors(report)).toBe(false);
    expect(
      report.warnings.some((w) => w.ruleId === "EXIT_NO_FAILURE"),
    ).toBe(false);
    expect(
      report.warnings.some((w) => w.ruleId === "EXIT_NO_RECOVERY"),
    ).toBe(false);
  });
});
