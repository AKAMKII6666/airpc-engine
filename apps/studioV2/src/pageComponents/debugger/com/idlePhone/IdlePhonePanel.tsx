/**
	* 调试器待机态电话模拟器：硬件键、号码盘、留言灯与拨号遮罩。
	*/
"use client";

import type { FC } from "react";
import { Button } from "@mui/material";
import {
	type PhoneUiState,
	type ReceiverMode,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
// 引用了PhoneKeypad组件，用于展示号码盘
import { PhoneKeypad } from "./phone/PhoneKeypad";
// 引用了PhoneHardwareRow组件，用于展示电话硬件操作键
import { PhoneHardwareRow } from "./phone/PhoneHardwareRow";
import {
	renderIdlePhoneDisplay,
	resolveIdleConnectCopy,
} from "./phone/idlePhoneDisplay";
import styles from "../../DebuggerShell.module.scss";

export type IdlePhonePanelProps = {
	/** 电话 UI 状态；决定键盘是否可按、屏幕文案与拨号遮罩 */
	phoneUi: PhoneUiState;
	/**
		* Host 建联请求中（主动拨号或接听来电）。
		* phase=dialing →「拨号中」；仅 busy →「接通中」，避免接听显示拨号。
		*/
	busy: boolean;
	/** 真实拨号失败人话；无则 undefined */
	error: string | undefined;
	/** 是否存在真实未读留言；决定留言灯和 * 键提示 */
	hasUnreadVoicemail: boolean;
	/** 点击重置或挂断时回到初始待机 */
	onReset: () => void;
	/** 摘机或免提入口；只改变本地电话 UI 状态 */
	onLiftReceiver: (mode: ReceiverMode) => void;
	/** 按下号码盘键；内部会处理留言 * 与拨号 debounce */
	onDialKey: (key: string) => void;
	/** 重播最近号码；当前原型回落到默认号码 */
	onRedial: () => void;
};

export const IdlePhonePanel: FC<IdlePhonePanelProps> = function IdlePhonePanel({
	// phoneUi 是电话硬件状态，用于控制待机界面
	phoneUi,
	// busy 表示真实拨号请求中，用于锁定部分操作
	busy,
	// error 是真实拨号失败信息，用于提示用户
	error,
	// hasUnreadVoicemail 表示 mailbox 存在未读槽，用于控制留言灯
	hasUnreadVoicemail,
	// onReset 重置电话，用于返回锁定待机
	onReset,
	// onLiftReceiver 是硬件接入回调，用于进入摘机或免提待拨状态
	onLiftReceiver,
	// onDialKey 是号码键回调，用于处理拨号与 * 留言入口
	onDialKey,
	// onRedial 是重播回调，用于触发重播拨号
	onRedial,
}) {
	const canDial =
		!busy && (phoneUi.phase === "ready" || phoneUi.phase === "debouncing");
	const isPhoneUnlocked = phoneUi.phase !== "locked";
	const connect = resolveIdleConnectCopy(phoneUi.phase, busy);

	return (
		<aside className={styles.phonePanel}>
			<div className={styles.panelHead}>
				<h2 className={styles.panelTitle}>电话模拟器</h2>
				{/* 引用了Button组件，用于重置电话调试器 UI 状态 */}
				<Button
					size="small"
					variant="outlined"
					className={styles.ghostButton}
					onClick={onReset}
				>
					重置
				</Button>
			</div>

			<div className={styles.phoneShell}>
				{renderIdlePhoneDisplay({
					phoneUi,
					hasUnreadVoicemail,
					isConnecting: connect.isConnecting,
					isOutboundDialing: connect.isOutboundDialing,
				})}

					{/* 引用了PhoneKeypad组件，用于展示号码盘 */}
					<PhoneKeypad canDial={canDial} onDialKey={onDialKey} />
				{error ? (
					<div className={styles.inlineError} role="alert">
						{error}
					</div>
				) : null}
				{connect.isConnecting ? (
					<div className={styles.dialingOverlay} role="status">
						<div className={styles.dialingPulse}>{connect.connectingTitle}</div>
						<div className={styles.dialingHint}>{connect.connectingHint}</div>
					</div>
				) : null}
			</div>

			{/* 引用了PhoneHardwareRow组件，用于展示电话硬件操作键 */}
			<PhoneHardwareRow
				isPhoneUnlocked={isPhoneUnlocked}
				busy={busy}
				onLiftReceiver={onLiftReceiver}
				onRedial={onRedial}
				onReset={onReset}
			/>
			<div className={styles.receiverRow}>
				<span className={styles.routeHint}>
					外部入口仅测试 free card；编辑器入口可定点章节与起始卡。
				</span>
				<span className={styles.receiverHint}>
					当前号码：{phoneUi.dialed || "未输入"}
				</span>
			</div>
		</aside>
	);
};
