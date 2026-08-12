/**
	* 调试器待机态电话模拟器：硬件键、号码盘、留言灯与拨号遮罩。
	*/
"use client";

import type { FC } from "react";
import { Button } from "@mui/material";
import {
	DIAL_KEYS,
	phoneDisplayMain,
	phoneDisplaySub,
	type PhoneUiState,
	type ReceiverMode,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import styles from "../DebuggerShell.module.scss";

export type IdlePhonePanelProps = {
	/** 电话 UI 状态；决定键盘是否可按、屏幕文案与拨号遮罩 */
	phoneUi: PhoneUiState;
	/** 真实拨号请求中；用于禁用重播与提示 */
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

type PhoneKeypadProps = {
	/** 当前号码盘是否允许输入；摘机/免提后为 true */
	canDial: boolean;
	/** 号码键回调；用于拨号 debounce 和留言 * 入口 */
	onDialKey: (key: string) => void;
};

const PhoneKeypad: FC<PhoneKeypadProps> = function PhoneKeypad({
	// canDial 表示号码盘是否解锁，用于控制按钮禁用态
	canDial,
	// onDialKey 是号码键回调，用于处理数字和 * 号
	onDialKey,
}) {
	return (
		<div className={styles.keypad}>
			{DIAL_KEYS.map((item) => (
				<button
					key={item.key}
					type="button"
					className={canDial ? styles.dialKey : styles.dialKeyDisabled}
					disabled={!canDial}
					onClick={() => onDialKey(item.key)}
				>
					<span className={styles.dialNumber}>{item.key}</span>
					<span className={styles.dialSub}>{item.sub}</span>
				</button>
			))}
		</div>
	);
};

type PhoneHardwareRowProps = {
	/** 电话是否已摘机或免提；用于控制硬件键禁用态 */
	isPhoneUnlocked: boolean;
	/** 真实拨号请求中；用于避免重复拨号 */
	busy: boolean;
	/** 摘机或免提入口；用于解锁号码盘 */
	onLiftReceiver: (mode: ReceiverMode) => void;
	/** 重播按钮回调；用于快速拨最近号码 */
	onRedial: () => void;
	/** 挂断按钮回调；用于回到待机 */
	onReset: () => void;
};

const PhoneHardwareRow: FC<PhoneHardwareRowProps> = function PhoneHardwareRow({
	// isPhoneUnlocked 表示电话是否已接入，用于控制硬件键禁用态
	isPhoneUnlocked,
	// busy 表示真实拨号请求中，用于禁用重复操作
	busy,
	// onLiftReceiver 是接入回调，用于摘机或免提
	onLiftReceiver,
	// onRedial 是重播回调，用于触发重播
	onRedial,
	// onReset 是挂断回调，用于回到待机
	onReset,
}) {
	return (
		<div className={styles.hardwareRow}>
			{/* 引用了Button组件，用于进入免提待拨状态 */}
			<Button
				variant="outlined"
				className={styles.hardwareButton}
				disabled={busy || isPhoneUnlocked}
				onClick={() => onLiftReceiver("speaker")}
			>
				R 免提
			</Button>
			{/* 引用了Button组件，用于进入摘机待拨状态 */}
			<Button
				variant="outlined"
				className={styles.hardwareButtonCall}
				disabled={busy || isPhoneUnlocked}
				onClick={() => onLiftReceiver("handset")}
			>
				摘机
			</Button>
			{/* 引用了Button组件，用于重播最近号码 */}
			<Button
				variant="outlined"
				className={styles.hardwareButton}
				disabled={busy || !isPhoneUnlocked}
				onClick={onRedial}
			>
				重播
			</Button>
			{/* 引用了Button组件，用于挂断并回到待机 */}
			<Button
				variant="outlined"
				className={styles.hardwareButtonHang}
				disabled={busy || !isPhoneUnlocked}
				onClick={onReset}
			>
				挂断
			</Button>
		</div>
	);
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
	const isDialing = phoneUi.phase === "dialing" || busy;

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
				<div className={styles.phoneDisplay}>
					<div className={styles.displayTop}>
						<span className={styles.signalBars}>|||</span>
						<span className={styles.displayIndicators}>
							<span
								className={
									hasUnreadVoicemail
										? styles.voicemailLamp
										: styles.voicemailLampMuted
								}
							>
								留言
							</span>
							<span className={styles.battery}>BAT</span>
						</span>
					</div>
					<div className={styles.displayMain}>{phoneDisplayMain(phoneUi)}</div>
					<div className={styles.displaySub}>
						{phoneDisplaySub(phoneUi, hasUnreadVoicemail)}
					</div>
				</div>

					{/* 引用了PhoneKeypad组件，用于展示号码盘 */}
					<PhoneKeypad canDial={canDial} onDialKey={onDialKey} />
				{error ? (
					<div className={styles.inlineError} role="alert">
						{error}
					</div>
				) : null}
				{isDialing ? (
					<div className={styles.dialingOverlay} role="status">
						<div className={styles.dialingPulse}>拨号中</div>
						<div className={styles.dialingHint}>
							正在通过 Host 建立通话，接通后由 LLM 先发言。
						</div>
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
