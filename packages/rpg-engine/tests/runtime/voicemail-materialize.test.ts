/**
 * V2-VM-6：VoicemailMaterializePipeline 出栈写槽
 */
import { describe, it } from "vitest";
import {
	baseProfile,
	clipCard,
	lookupFromMap,
	voicemailCard,
} from "./voicemailMaterializeFixtures.js";
import {
	assertMaterializeClipSkipsLlm,
	assertMaterializeUnreadAndFailed,
	assertMaterializeWithoutGeneratePort,
} from "./voicemail-materialize.helpers.js";

describe("voicemail materialize pipeline (V2-VM-6)", () => {
	it("出栈写 unread 槽；Board.pending 仍空；失败不回滚其它槽", async () => {
		await assertMaterializeUnreadAndFailed(
			baseProfile(),
			voicemailCard,
			lookupFromMap,
		);
	});

	it("playbackClipId 跳过 LLM，直接 audioRef=clip", async () => {
		await assertMaterializeClipSkipsLlm(
			baseProfile(),
			clipCard,
			lookupFromMap,
		);
	});

	it("未注入 generateVoicemail → generate_failed，不抛", async () => {
		await assertMaterializeWithoutGeneratePort(
			baseProfile(),
			voicemailCard,
			lookupFromMap,
		);
	});
});
