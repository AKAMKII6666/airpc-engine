/**
 * outboundWindow → schedule.gates 样板：窗外 defer 外呼。
 * 逻辑与既有 isLocalHourInOutboundWindow 同口径，经包贡献便于开关。
 */
import {
	isLocalHourInOutboundWindow,
	localHourFromIso,
} from "../../../runtime/outboundWindow.js";
import type { ScheduleGate } from "../../contributeTypes.js";
import type { FirstPartyPack } from "../../types.js";

export const OUTBOUND_WINDOW_GATE_PACK_ID = "outbound-window-gate";
export const OUTBOUND_WINDOW_GATE_ID = "outbound.window";

export const outboundWindowScheduleGate: ScheduleGate = {
	gateId: OUTBOUND_WINDOW_GATE_ID,
	allow(input) {
		const localHour = localHourFromIso(input.nowIso);
		return isLocalHourInOutboundWindow(
			localHour,
			input.profile.user?.outboundWindow,
		);
	},
};

export const outboundWindowGatePack: FirstPartyPack = {
	manifest: {
		packId: OUTBOUND_WINDOW_GATE_PACK_ID,
		packVersion: "1.0.0",
		apiVersion: 1,
		domains: ["background"],
	},
	contribute: {
		background: {
			"schedule.gates": [outboundWindowScheduleGate],
		},
	},
};
