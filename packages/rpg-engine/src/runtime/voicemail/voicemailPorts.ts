/**
 * 模块名称：语音留言外置端口（生成 / 未读通知）
 * 模块说明：
 * - 生成与 LED 分端口；引擎不持 LLM Key、不调真机硬件
 * - Host 注入；缺省 noop 策略由 Materialize 处理（失败标槽、不炸）
 * 需求：语音留言改造 §3.4–§3.6；执行索引 V2-VM-7
 */
import type { CallCardDefinition } from "../../schema/callCard.js";

/** 物化输入：卡合同 + 实例定位；assembledPrompt 可选预拼串 */
export type GenerateVoicemailInput = {
	card: CallCardDefinition;
	agentId: string;
	packageId: string;
	instanceId: string;
	assembledPrompt?: string;
};

/** 物化产物：调试 text 与/或真机 audioRef；引擎不解码 WAV */
export type GenerateVoicemailResult = {
	text?: string;
	audioRef?: string;
};

/**
 * 引擎外 LLM/TTS 口。
 * Studio Manual 可注入假实现；未注入时 Materialize 走失败/跳过策略。
 */
export type GenerateVoicemailPort = (
	input: GenerateVoicemailInput,
) => Promise<GenerateVoicemailResult>;

/**
 * 未读推送：壳同步 LED/角标。
 * 真源仍在 Profile.telephony.voicemails[]（deriveVoicemailHasUnread）。
 */
export type OnVoicemailUnreadChanged = (hasUnread: boolean) => void;

/** 未注入生成口时的显式失败：不抛、由管线写 generate_failed */
export function createNoopGenerateVoicemail(): GenerateVoicemailPort {
	return async function noopGenerateVoicemail() {
		return {};
	};
}

/** 单测 / Manual：记录调用并回固定正文 */
export function createRecordingGenerateVoicemail(
	fixed: GenerateVoicemailResult = { text: "recording-voicemail" },
): GenerateVoicemailPort & { calls: GenerateVoicemailInput[] } {
	const calls: GenerateVoicemailInput[] = [];
	const port = async function recordingGenerateVoicemail(
		input: GenerateVoicemailInput,
	): Promise<GenerateVoicemailResult> {
		calls.push(input);
		return { ...fixed };
	};
	return Object.assign(port, { calls });
}

/** 单测：记录未读回调 */
export function createRecordingUnreadNotifier(): OnVoicemailUnreadChanged & {
	calls: boolean[];
} {
	const calls: boolean[] = [];
	const notify = function onVoicemailUnreadChanged(hasUnread: boolean): void {
		calls.push(hasUnread);
	};
	return Object.assign(notify, { calls });
}
