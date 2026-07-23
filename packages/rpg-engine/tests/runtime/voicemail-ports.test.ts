/**
 * V2-VM-7：generateVoicemail / onVoicemailUnreadChanged 端口
 */
import { describe, expect, it } from "vitest";
import {
	assembleVoicemailPrompt,
	createNoopGenerateVoicemail,
	createRecordingGenerateVoicemail,
	pushVoicemailGenStack,
	runVoicemailMaterializePipeline,
} from "../../src/index.js";
import {
	baseProfile,
	lookupFromMap,
	voicemailCard,
} from "./voicemailMaterializeFixtures.js";

describe("voicemail ports (V2-VM-7)", () => {
	it("noop 返回空产物；recording 可注入", async () => {
		const noop = createNoopGenerateVoicemail();
		expect(
			await noop({
				card: voicemailCard,
				agentId: "lanxing",
				packageId: "pkg",
				instanceId: "i1",
			}),
		).toEqual({});
		const recording = createRecordingGenerateVoicemail({
			text: "a",
			audioRef: "ref://a",
		});
		const out = await recording({
			card: voicemailCard,
			agentId: "lanxing",
			packageId: "pkg",
			instanceId: "i1",
			assembledPrompt: assembleVoicemailPrompt(voicemailCard),
		});
		expect(out).toEqual({ text: "a", audioRef: "ref://a" });
		expect(recording.calls).toHaveLength(1);
	});

	it("端口抛错 → 槽 generate_failed，管线不炸", async () => {
		const profile = baseProfile();
		pushVoicemailGenStack(profile, {
			id: "fx_throw",
			agentId: "lanxing",
			cardId: "lanxing_voicemail",
			packageId: "pkg",
			source: "attach",
			createdAt: "2026-07-23T00:00:00.000Z",
		});
		const result = await runVoicemailMaterializePipeline({
			profile,
			nowIso: "2026-07-23T00:01:00.000Z",
			lookupCard: lookupFromMap({ lanxing_voicemail: voicemailCard }),
			generateVoicemail: async function () {
				throw new Error("llm down");
			},
		});
		expect(result.results[0]?.status).toBe("generate_failed");
		expect(result.results[0]?.error).toBe("llm down");
	});
});
