/**
	* Studio 侧 generateVoicemail 端口：调试器优先用卡合同 speakableBrief 作为留言正文。
	* 引擎不持 LLM Key；真机 TTS 由壳另注。未写 playbackClipId 时走本口，避免 generate_failed。
	*/
import type {
	GenerateVoicemailInput,
	GenerateVoicemailPort,
	GenerateVoicemailResult,
} from "@airpc/rpg-engine";

/**
	* 物化正文：speakableBrief → assembledPrompt → 明确失败。
	* 调试听留言只需可读 text；不在此调 LLM，避免挂机后阻塞 PostCallJob。
	*/
export function createStudioGenerateVoicemailPort(): GenerateVoicemailPort {
	return async function studioGenerateVoicemail(
		input: GenerateVoicemailInput,
	): Promise<GenerateVoicemailResult> {
		const speakable = input.card.context?.speakableBrief?.trim();
		if (speakable) {
			return { text: speakable };
		}
		const assembled = input.assembledPrompt?.trim();
		if (assembled) {
			return { text: assembled };
		}
		return {};
	};
}
