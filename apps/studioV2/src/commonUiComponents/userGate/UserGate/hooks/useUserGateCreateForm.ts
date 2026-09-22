/**
	* UserGate 新建表单瞬时态：昵称、busy、错误与 create 编排。
	*/
"use client";

import { useState } from "react";

export function useUserGateCreateForm(opts: {
	createAndSelect: (nickname: string) => Promise<string>;
	onSelected: (userId: string) => void;
}): {
	nickname: string;
	createBusy: boolean;
	createError: string | undefined;
	setNickname: (value: string) => void;
	onCreate: () => void;
} {
	const { createAndSelect, onSelected } = opts;
	const [nickname, setNickname] = useState("");
	const [createBusy, setCreateBusy] = useState(false);
	const [createError, setCreateError] = useState<string | undefined>(
		undefined,
	);

	return {
		nickname,
		createBusy,
		createError,
		setNickname,
		onCreate() {
			setCreateError(undefined);
			setCreateBusy(true);
			void createAndSelect(nickname)
				.then(function (userId) {
					setNickname("");
					onSelected(userId);
				})
				.catch(function (err: unknown) {
					setCreateError(
						err instanceof Error ? err.message : "新建玩家失败",
					);
				})
				.finally(function () {
					setCreateBusy(false);
				});
		},
	};
}
