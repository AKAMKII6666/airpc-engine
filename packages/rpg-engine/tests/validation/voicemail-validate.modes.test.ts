/**
 * V2-VM-3：voicemail 强制组合校验
 */
import { rm } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { hasBlockingErrors } from "../../src/index.js";
import {
	mutateGoldenCard,
	prepareVmValidateWorkspace,
	VM_VALIDATE_PKG,
} from "./voicemailValidateHelpers.js";

describe("validatePackage voicemail modes (V2-VM-3)", () => {
	let tmpRoot: string | undefined;

	afterEach(async () => {
		if (tmpRoot) {
			await rm(tmpRoot, { recursive: true, force: true });
			tmpRoot = undefined;
		}
	});

	it("合法组合无 VOICEMAIL_* / PLAYBACK_NO_ASSET", async () => {
		const prepared = await prepareVmValidateWorkspace();
		tmpRoot = prepared.tmpRoot;
		await mutateGoldenCard(prepared.dataRoot, (card) => {
			card.cardKind = "voicemail";
			card.interactionMode = "playback_only";
			card.entryMode = "mailbox_open";
			card.toolPolicy = { mode: "deny_all" };
			const ctx = (card.context ?? {}) as Record<string, unknown>;
			delete ctx.playbackClipId;
			card.context = ctx;
		});
		const report = await prepared.host.validatePackage(VM_VALIDATE_PKG);
		expect(
			report.errors.filter((e) => e.ruleId.startsWith("VOICEMAIL_")),
		).toEqual([]);
		expect(
			report.errors.some((e) => e.ruleId === "PLAYBACK_NO_ASSET"),
		).toBe(false);
		expect(
			report.errors.some((e) => e.ruleId === "SCHEMA_UNSUPPORTED"),
		).toBe(false);
	});

	it("VOICEMAIL_INTERACTION_MODE", async () => {
		const prepared = await prepareVmValidateWorkspace();
		tmpRoot = prepared.tmpRoot;
		await mutateGoldenCard(prepared.dataRoot, (card) => {
			card.cardKind = "voicemail";
			card.interactionMode = "realtime_dialogue";
			card.entryMode = "mailbox_open";
			card.toolPolicy = { mode: "deny_all" };
		});
		const report = await prepared.host.validatePackage(VM_VALIDATE_PKG);
		expect(
			report.errors.some((e) => e.ruleId === "VOICEMAIL_INTERACTION_MODE"),
		).toBe(true);
		expect(hasBlockingErrors(report)).toBe(true);
	});

	it("VOICEMAIL_ENTRY_MODE", async () => {
		const prepared = await prepareVmValidateWorkspace();
		tmpRoot = prepared.tmpRoot;
		await mutateGoldenCard(prepared.dataRoot, (card) => {
			card.cardKind = "voicemail";
			card.interactionMode = "playback_only";
			card.entryMode = "outbound_auto";
			card.toolPolicy = { mode: "deny_all" };
			const ctx = (card.context ?? {}) as Record<string, unknown>;
			ctx.playbackClipId = "clip_dummy";
			card.context = ctx;
		});
		const report = await prepared.host.validatePackage(VM_VALIDATE_PKG);
		expect(
			report.errors.some((e) => e.ruleId === "VOICEMAIL_ENTRY_MODE"),
		).toBe(true);
	});

	it("VOICEMAIL_TOOL_POLICY", async () => {
		const prepared = await prepareVmValidateWorkspace();
		tmpRoot = prepared.tmpRoot;
		await mutateGoldenCard(prepared.dataRoot, (card) => {
			card.cardKind = "voicemail";
			card.interactionMode = "playback_only";
			card.entryMode = "mailbox_open";
			card.toolPolicy = { mode: "inherit_free" };
		});
		const report = await prepared.host.validatePackage(VM_VALIDATE_PKG);
		expect(
			report.errors.some((e) => e.ruleId === "VOICEMAIL_TOOL_POLICY"),
		).toBe(true);
	});
});
