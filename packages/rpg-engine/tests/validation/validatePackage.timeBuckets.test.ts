/**
 * 模块名称：validatePackage 拒载 timeBuckets（从 golden-handoff.validate 拆出以降基线）
 */
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createEngineHost } from "../../src/index.js";
import { createFsContentPort } from "../helpers/fsContentPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("validatePackage promptScene timeBuckets", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("PROMPT_SCENE_TIME_BUCKETS_REMOVED when match has timeBuckets", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-val-buckets-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });
    const cardPath = path.join(
      dataRoot,
      "storis-packages/golden_handoff/cards/doubao_intro_outbound.s-card.json",
    );
    const card = JSON.parse(await readFile(cardPath, "utf8")) as Record<
      string,
      unknown
    >;
    const ctx = card.context as Record<string, unknown>;
    ctx.promptScenes = [
      {
        layerId: "legacy_bucket",
        match: { callDirection: "outbound", timeBuckets: ["afternoon"] },
        patch: { openingSpeakable: "旧桶开场" },
      },
    ];
    await writeFile(cardPath, JSON.stringify(card, null, 2));

    const host = createEngineHost({ persist: false, content: createFsContentPort() });
    await host.loadWorkspace(dataRoot);
    const report = await host.validatePackage("golden_handoff");
    expect(
      report.errors.some(
        (e) => e.ruleId === "PROMPT_SCENE_TIME_BUCKETS_REMOVED",
      ),
    ).toBe(true);
  });
});
