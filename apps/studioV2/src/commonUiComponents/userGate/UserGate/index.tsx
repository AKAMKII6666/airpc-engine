/**
	* UserGate：无密码选玩家；进画布 / 提示词预览硬门禁。
	* 未选时 onClose 为空操作且父级保持 open，实现硬挂。
	*/
"use client";

import type { FC } from "react";
import { useState } from "react";
// 引用了AppModal组件，用于 UserGate 弹层壳
import { AppModal } from "@studio-v2/src/commonUiComponents/modal/app/AppModal";
import { useUserGateSessionBis } from "@studio-v2/src/bis/pageBis/users/gate/userGateSession.bis";
// 引用了UserGateBody组件，用于列表与新建区
import { UserGateBody } from "./com/UserGateBody";

export type UserGateProps = {
	open: boolean;
	/**
		* 已选用户时可关；未选时忽略（硬门禁）。
		* 省略则完全不可 Esc/遮罩关闭（父级保持 open）。
		*/
	onClose?: () => void;
	/** 选定后回调（studioSession 已写入） */
	onSelected: (userId: string) => void;
	title?: string;
	/** 是否允许在已有当前用户时关闭；默认 true */
	allowDismissWhenSelected?: boolean;
	/** 当前已选 userId；用于硬门禁关闭判定 */
	currentUserId?: string;
};

export const UserGate: FC<UserGateProps> = function ({
	// open 表示弹层是否打开，用于显隐
	open,
	// onClose 用于已选时可关
	onClose,
	// onSelected 用于选定后通知调用方
	onSelected,
	// title 表示弹层标题，用于展示
	title = "选择玩家",
	// allowDismissWhenSelected 表示已选时可关，用于硬门禁判定
	allowDismissWhenSelected = true,
	// currentUserId 表示当前会话玩家，用于硬门禁与高亮
	currentUserId = "",
}) {
	const gate = useUserGateSessionBis(open);
	const [nickname, setNickname] = useState("");
	const [createBusy, setCreateBusy] = useState(false);
	const [createError, setCreateError] = useState<string | undefined>(
		undefined,
	);

	const canDismiss =
		allowDismissWhenSelected &&
		currentUserId.trim() !== "" &&
		typeof onClose === "function";

	return (
		// 引用了AppModal组件，用于 UserGate 弹层壳
		<AppModal
			open={open}
			title={title}
			description="无密码。选定玩家后建立 Profile / Memory 上下文（编辑 Content 本身不依赖用户）。"
			onClose={function () {
				if (canDismiss) onClose?.();
			}}
			busy={gate.loading || createBusy}
			maxWidth="sm"
		>
			{/* 引用了UserGateBody组件，用于列表与新建区 */}
			<UserGateBody
				users={gate.users}
				loading={gate.loading}
				error={gate.error}
				createError={createError}
				createBusy={createBusy}
				currentUserId={currentUserId}
				nickname={nickname}
				onNicknameChange={setNickname}
				onSelect={function (userId, nick) {
					gate.selectUser(userId, nick);
					onSelected(userId);
				}}
				onCreate={function () {
					setCreateError(undefined);
					setCreateBusy(true);
					void gate
						.createAndSelect(nickname)
						.then(function (userId) {
							setNickname("");
							onSelected(userId);
						})
						.catch(function (err: unknown) {
							setCreateError(
								err instanceof Error
									? err.message
									: "新建玩家失败",
							);
						})
						.finally(function () {
							setCreateBusy(false);
						});
				}}
				onReload={gate.reload}
			/>
		</AppModal>
	);
};
