/**
 * V2-VM-3 校验单测共用：临时 workspace + 改卡
 */
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEngineHost } from "../../src/index.js";
import { createFsContentPort } from "../helpers/fsContentPort.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

export const VM_VALIDATE_PKG = "golden_handoff";
export const VM_VALIDATE_CARD_REL =
	"storis-packages/golden_handoff/cards/doubao_intro_outbound.s-card.json";

export type VmValidateHost = ReturnType<typeof createEngineHost>;

export async function prepareVmValidateWorkspace(): Promise<{
	tmpRoot: string;
	dataRoot: string;
	host: VmValidateHost;
}> {
	const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-val-vm-"));
	const dataRoot = path.join(tmpRoot, "data");
	await cp(dataSrc, dataRoot, { recursive: true });
	const host = createEngineHost({
		persist: false,
		content: createFsContentPort(),
	});
	await host.loadWorkspace(dataRoot);
	return { tmpRoot, dataRoot, host };
}

export async function mutateGoldenCard(
	dataRoot: string,
	mutator: (card: Record<string, unknown>) => void,
): Promise<void> {
	const cardPath = path.join(dataRoot, VM_VALIDATE_CARD_REL);
	const card = JSON.parse(await readFile(cardPath, "utf8")) as Record<
		string,
		unknown
	>;
	mutator(card);
	await writeFile(cardPath, JSON.stringify(card, null, 2));
}
