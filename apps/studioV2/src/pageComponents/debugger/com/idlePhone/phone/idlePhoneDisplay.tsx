/**
	* 待机电话屏幕文案与接通态。从 IdlePhonePanel 拆出，避免组件文件超行数告警。
	*/
"use client";

import {
	phoneDisplayMain,
	phoneDisplaySub,
	type PhoneUiState,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import styles from "../../../DebuggerShell.module.scss";

export function resolveIdleConnectCopy(
	phase: PhoneUiState["phase"],
	busy: boolean,
) {
	const isOutboundDialing = phase === "dialing";
	const isConnecting = isOutboundDialing || busy;
	return {
		isConnecting,
		isOutboundDialing,
		connectingTitle: isOutboundDialing ? "拨号中" : "接通中",
		connectingHint: isOutboundDialing
			? "正在通过 Host 建立通话，接通后由 LLM 先发言。"
			: "正在接听来电，接通后由 LLM 先发言。",
	};
}

export function renderIdlePhoneDisplay(input: {
	phoneUi: PhoneUiState;
	hasUnreadVoicemail: boolean;
	isConnecting: boolean;
	isOutboundDialing: boolean;
}) {
	const main =
		input.isConnecting && !input.isOutboundDialing
			? "接通中"
			: phoneDisplayMain(input.phoneUi);
	const sub =
		input.isConnecting && !input.isOutboundDialing
			? "正在接听来电"
			: phoneDisplaySub(input.phoneUi, input.hasUnreadVoicemail);
	return (
		<div className={styles.phoneDisplay}>
			<div className={styles.displayTop}>
				<span className={styles.signalBars}>|||</span>
				<span className={styles.displayIndicators}>
					<span
						className={
							input.hasUnreadVoicemail
								? styles.voicemailLamp
								: styles.voicemailLampMuted
						}
					>
						留言
					</span>
					<span className={styles.battery}>BAT</span>
				</span>
			</div>
			<div className={styles.displayMain}>{main}</div>
			<div className={styles.displaySub}>{sub}</div>
		</div>
	);
}
