/**
 * 模块名称：beginCall 卡面钳制（voicemail / mailbox_open）
 * 模块说明：从 createEngineHost 拆出，避免 Host 组合函数净增；
 * 听留言会话强制 playback_only + mailbox_open。
 */
import type { CallCardDefinition } from "../../schema/callCard.js";
import type { ResolveResult } from "../../host/types.js";

/** mailbox_open 或 voicemail 卡：钳制 interactionMode / entryMode */
export function cardForBeginCall(result: ResolveResult): CallCardDefinition {
	if (
		result.intent.kind === "mailbox_open" ||
		result.card.cardKind === "voicemail"
	) {
		return {
			...result.card,
			interactionMode: "playback_only",
			entryMode: "mailbox_open",
		};
	}
	return result.card;
}
