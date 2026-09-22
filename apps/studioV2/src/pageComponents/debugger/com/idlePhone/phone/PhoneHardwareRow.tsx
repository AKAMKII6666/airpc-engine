/**
	* 待机电话硬件键行；从 IdlePhonePanel 拆出以压住文件行数。
	*/
"use client";

import type { FC } from "react";
import { Button } from "@mui/material";
import type { ReceiverMode } from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import styles from "../../../DebuggerShell.module.scss";

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

export const PhoneHardwareRow: FC<PhoneHardwareRowProps> = function PhoneHardwareRow({
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
