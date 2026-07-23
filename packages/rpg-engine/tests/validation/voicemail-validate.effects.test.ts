/**
 * V2-VM-3：废弃 create_voicemail + mailbox_open 配对
 */
import { rm } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { hasBlockingErrors } from "../../src/index.js";
import {
	mutateGoldenCard,
	prepareVmValidateWorkspace,
	VM_VALIDATE_PKG,
} from "./voicemailValidateHelpers.js";

describe("validatePackage voicemail effects (V2-VM-3)", () => {
	let tmpRoot: string | undefined;

	afterEach(async () => {
		if (tmpRoot) {
			await rm(tmpRoot, { recursive: true, force: true });
			tmpRoot = undefined;
		}
	});

	it("VOICEMAIL_ENTRY_KIND：非 voicemail 使用 mailbox_open", async () => {
		const prepared = await prepareVmValidateWorkspace();
		tmpRoot = prepared.tmpRoot;
		await mutateGoldenCard(prepared.dataRoot, (card) => {
			card.cardKind = "story";
			card.entryMode = "mailbox_open";
			card.interactionMode = "realtime_dialogue";
		});
		const report = await prepared.host.validatePackage(VM_VALIDATE_PKG);
		expect(
			report.errors.some((e) => e.ruleId === "VOICEMAIL_ENTRY_KIND"),
		).toBe(true);
	});

	it("VOICEMAIL_CREATE_EFFECT：拒绝 create_voicemail", async () => {
		const prepared = await prepareVmValidateWorkspace();
		tmpRoot = prepared.tmpRoot;
		await mutateGoldenCard(prepared.dataRoot, (card) => {
			const exits = card.exits as Array<{
				exitId: string;
				effects: Array<Record<string, unknown>>;
			}>;
			const first = exits[0];
			if (!first) return;
			first.effects.push({
				id: "fx_legacy_voicemail",
				effect: "create_voicemail",
				agentId: "doubao",
				topicHint: "legacy",
			});
		});
		const report = await prepared.host.validatePackage(VM_VALIDATE_PKG);
		expect(
			report.errors.some((e) => e.ruleId === "VOICEMAIL_CREATE_EFFECT"),
		).toBe(true);
		expect(hasBlockingErrors(report)).toBe(true);
	});
});
