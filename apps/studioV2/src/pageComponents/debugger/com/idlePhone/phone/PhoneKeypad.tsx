/**
	* 待机电话号码盘；从 IdlePhonePanel 拆出以压住文件行数。
	*/
"use client";

import type { FC } from "react";
import { DIAL_KEYS } from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import styles from "../../../DebuggerShell.module.scss";

type PhoneKeypadProps = {
	/** 当前号码盘是否允许输入；摘机/免提后为 true */
	canDial: boolean;
	/** 号码键回调；用于拨号 debounce 和留言 * 入口 */
	onDialKey: (key: string) => void;
};

export const PhoneKeypad: FC<PhoneKeypadProps> = function PhoneKeypad({
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
