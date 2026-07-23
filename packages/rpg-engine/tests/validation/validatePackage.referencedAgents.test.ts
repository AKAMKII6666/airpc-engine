/**
 * S8-2：validatePackage 派生引用角色校验 + PARTICIPANT_UNKNOWN 降级 warning
 */
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  createEngineHost,
  hasBlockingErrors,
  type EngineHost,
} from "../../src/index.js";
import { createFsContentPort } from "../helpers/fsContentPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

let tmpRoot: string | undefined;

afterEach(async () => {
  if (tmpRoot) {
    await rm(tmpRoot, { recursive: true, force: true });
    tmpRoot = undefined;
  }
});

async function hostWithPackage(packageId: string): Promise<{
  host: EngineHost;
  dataRoot: string;
}> {
  tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-ref-agents-"));
  const dataRoot = path.join(tmpRoot, "data");
  await cp(dataSrc, dataRoot, { recursive: true });
  const host = createEngineHost({ persist: false, content: createFsContentPort() });
  await host.loadWorkspace(dataRoot);
  return { host, dataRoot };
}

describe("validatePackage REFERENCED_AGENT_UNKNOWN (S8-2)", () => {
  it("errors when ownerAgentId not in character library", async () => {
    const { host, dataRoot } = await hostWithPackage("wrong_number_act1");
    const cardPath = path.join(
      dataRoot,
      "storis-packages/wrong_number_act1/cards/lanxing_wrong_number.s-card.json",
    );
    const card = JSON.parse(await readFile(cardPath, "utf8")) as {
      ownerAgentId: string;
    };
    card.ownerAgentId = "no_such_agent";
    await writeFile(cardPath, JSON.stringify(card, null, 2));

    const report = await host.validatePackage("wrong_number_act1");
    expect(
      report.errors.some((e) => e.ruleId === "REFERENCED_AGENT_UNKNOWN"),
    ).toBe(true);
  });
});

describe("validatePackage legacy participant warning (S8-2)", () => {
  it("PARTICIPANT_UNKNOWN is warning for unknown legacy participant", async () => {
    const { host, dataRoot } = await hostWithPackage("wrong_number_act1");
    const confPath = path.join(
      dataRoot,
      "storis-packages/wrong_number_act1/story.conf.json",
    );
    const conf = JSON.parse(await readFile(confPath, "utf8")) as {
      participants: string[];
    };
    conf.participants = ["lanxing", "legacy_unknown_agent"];
    await writeFile(confPath, JSON.stringify(conf, null, 2));

    const report = await host.validatePackage("wrong_number_act1");
    expect(
      report.warnings.some((e) => e.ruleId === "PARTICIPANT_UNKNOWN"),
    ).toBe(true);
    expect(
      report.errors.some((e) => e.ruleId === "PARTICIPANT_UNKNOWN"),
    ).toBe(false);
  });
});

describe("validatePackage empty participants (S8-2)", () => {
  it("does not emit PARTICIPANT_UNKNOWN", async () => {
    const { host, dataRoot } = await hostWithPackage("wrong_number_act1");
    const confPath = path.join(
      dataRoot,
      "storis-packages/wrong_number_act1/story.conf.json",
    );
    const conf = JSON.parse(await readFile(confPath, "utf8")) as Record<
      string,
      unknown
    >;
    conf.participants = [];
    await writeFile(confPath, JSON.stringify(conf, null, 2));

    const report = await host.validatePackage("wrong_number_act1");
    expect(
      report.warnings.some((e) => e.ruleId === "PARTICIPANT_UNKNOWN"),
    ).toBe(false);
  });
});

describe("validatePackage path B owner (S8-2)", () => {
  it("referenced agent absent from legacy participants is not error", async () => {
    const { host, dataRoot } = await hostWithPackage("golden_handoff");
    const confPath = path.join(
      dataRoot,
      "storis-packages/golden_handoff/story.conf.json",
    );
    const conf = JSON.parse(await readFile(confPath, "utf8")) as Record<
      string,
      unknown
    >;
    conf.participants = ["lanxing"];
    await writeFile(confPath, JSON.stringify(conf, null, 2));

    const report = await host.validatePackage("golden_handoff");
    expect(
      report.errors.some(
        (e) =>
          e.ruleId === "PARTICIPANT_UNKNOWN" ||
          e.ruleId === "REFERENCED_AGENT_UNKNOWN",
      ),
    ).toBe(false);
    expect(hasBlockingErrors(report)).toBe(false);
  });
});

describe("validatePackage derived character checks (S8-2)", () => {
  it("FREE_CARD_MISSING applies to derived referenced agents", async () => {
    const { host, dataRoot } = await hostWithPackage("golden_handoff");
    await rm(
      path.join(dataRoot, "characters/free-cards/xiaopi_free.s-card.json"),
    );

    const report = await host.validatePackage("golden_handoff");
    expect(report.errors.some((e) => e.ruleId === "FREE_CARD_MISSING")).toBe(
      true,
    );
  });
});
