/**
	* 调试器真实外呼 modal：模拟座机来电，只提供接听/挂断。
	*/
"use client";

import type { FC } from "react";
import { Avatar, Button, Dialog, DialogActions, DialogContent } from "@mui/material";
import type { DebuggerIncomingCallView } from "@studio-v2/typeFiles/debugger/callSession";
import styles from "../DebuggerShell.module.scss";

export type IncomingCallModalProps = {
	/** 当前 pending 外呼；null 时 modal 关闭 */
	incomingCall: DebuggerIncomingCallView | null;
	/** 接听/拒接命令中 */
	busy: boolean;
	/** 命令失败人话；无则 undefined */
	error: string | undefined;
	/** 接听当前外呼 */
	onAccept: (eventId: string) => void;
	/** 挂断当前外呼 */
	onReject: (eventId: string) => void;
};

export const IncomingCallModal: FC<IncomingCallModalProps> = function IncomingCallModal({
	// incomingCall 是 Host pending incoming event 的 UI 投影，用于控制弹窗内容
	incomingCall,
	// busy 表示接听/拒接请求中，用于锁定按钮
	busy,
	// error 是接听/拒接失败信息，用于展示请求错误
	error,
	// onAccept 走 agent_outbound 正式通话路径，用于接听当前外呼
	onAccept,
	// onReject 只关闭 Host incoming event，用于拒接当前外呼
	onReject,
}) {
		const open = incomingCall !== null;
		const initial = incomingCall?.displayName.slice(0, 1) ?? "?";

		return (
			// 引用了Dialog组件，用于模拟真实角色外呼弹窗
			<Dialog
				open={open}
				maxWidth="xs"
				fullWidth
				PaperProps={{ className: styles.incomingDialog }}
			>
				{incomingCall ? (
					<>
						{/* 引用了DialogContent组件，用于展示外呼角色信息 */}
						<DialogContent className={styles.incomingContent}>
							{/* 引用了Avatar组件，用于展示外呼角色头像占位 */}
							<Avatar className={styles.incomingAvatar}>{initial}</Avatar>
							<div className={styles.incomingTitle}>
								{incomingCall.displayName} 呼入
							</div>
							<div className={styles.incomingMeta}>
								{incomingCall.phoneNumber} · {incomingCall.cardId}
							</div>
							{error ? (
								<div className={styles.inlineError} role="alert">
									{error}
								</div>
							) : null}
						</DialogContent>
						{/* 引用了DialogActions组件，用于承载接听和挂断按钮 */}
						<DialogActions className={styles.incomingActions}>
							{/* 引用了Button组件，用于拒接外呼 */}
							<Button
								variant="outlined"
								disabled={busy}
								className={styles.hardwareButtonHang}
								onClick={() => onReject(incomingCall.eventId)}
							>
								挂断
							</Button>
							{/* 引用了Button组件，用于接听外呼 */}
							<Button
								variant="contained"
								disabled={busy}
								onClick={() => onAccept(incomingCall.eventId)}
							>
								{busy ? "处理中" : "接听"}
							</Button>
						</DialogActions>
					</>
				) : null}
			</Dialog>
		);
};
