/**
	* 新建章 / 新建包时可选的默认起点通话卡。
	*/
import { randomUUID } from "node:crypto";
import type { CallCardDefinition } from "@airpc/rpg-engine";

/** 生成带 UUID 的默认起点卡；privateBrief 可带入包描述。 */
export function buildDefaultStartCard(
	privateBrief = "",
): CallCardDefinition {
	return {
		cardId: `card_${randomUUID().replace(/-/g, "").toLowerCase()}`,
		cardKind: "story",
		title: "第一张通话卡",
		ownerAgentId: "",
		entryMode: "inbound_user_dial",
		interactionMode: "realtime_dialogue",
		context: { privateBrief, speakableBrief: "" },
		objectives: { requiredBeats: [] },
		toolPolicy: {
			schemaVersion: 2,
			mode: "inherit_free",
			options: {
				request_hangup: {
					allowedReasonKinds: ["natural", "policy"],
				},
			},
		},
		exits: [],
	};
}
