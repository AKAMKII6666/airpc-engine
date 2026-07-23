/**
 * 模块名称：Host 挂机后语音留言物化阶段
 * 模块说明：从 createEngineHost 拆出，避免 Host 组合文件净增；
 * plan 终态后、saveProfile 前调用。
 */
import type { PlayerProfile } from "../schema/profile.js";
import type { ScheduledCardLookup } from "../schedule/scheduleCardReferenceResolver.js";
import { runVoicemailMaterializePipeline } from "../runtime/voicemail/voicemailMaterialize.js";
import type {
	GenerateVoicemailPort,
	OnVoicemailUnreadChanged,
} from "../runtime/voicemail/voicemailPorts.js";

export type VoicemailMaterializeHostPorts = {
	generateVoicemail?: GenerateVoicemailPort | null;
	onVoicemailUnreadChanged?: OnVoicemailUnreadChanged | null;
};

/** Effect plan 终态后出栈物化；空栈无副作用 */
export async function materializeVoicemailsAfterPlan(input: {
	profile: PlayerProfile;
	nowIso: string;
	lookupCard: ScheduledCardLookup;
	ports: VoicemailMaterializeHostPorts;
}): Promise<void> {
	await runVoicemailMaterializePipeline({
		profile: input.profile,
		nowIso: input.nowIso,
		lookupCard: input.lookupCard,
		generateVoicemail: input.ports.generateVoicemail,
		onVoicemailUnreadChanged: input.ports.onVoicemailUnreadChanged,
	});
}
