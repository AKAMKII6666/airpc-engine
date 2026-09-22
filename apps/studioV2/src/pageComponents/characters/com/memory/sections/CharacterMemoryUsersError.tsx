/**
	* 记忆区调试用户列表错误态。
	*/
"use client";

import type { FC } from "react";
import { Alert } from "@mui/material";
import { CharacterMemorySectionFrame } from "./CharacterMemorySectionFrame";

export type CharacterMemoryUsersErrorProps = {
	/** 用户列表加载失败文案 */
	message: string;
};

export const CharacterMemoryUsersError: FC<
	CharacterMemoryUsersErrorProps
> = function CharacterMemoryUsersError({
	// message 是用户列表加载失败文案，用于错误 Alert
	message,
}) {
	return (
		// 引用了CharacterMemorySectionFrame组件，用于记忆区统一标题外壳
		<CharacterMemorySectionFrame>
			{/* 引用了Alert组件，用于调试用户列表错误 */}
			<Alert severity="error" role="alert">
				{message}
			</Alert>
		</CharacterMemorySectionFrame>
	);
};
