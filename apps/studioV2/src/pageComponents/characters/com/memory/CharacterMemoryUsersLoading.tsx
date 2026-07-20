/**
	* 记忆区调试用户列表加载态。
	*/
"use client";

import type { FC } from "react";
import { Typography } from "@mui/material";
import { CharacterMemorySectionFrame } from "./CharacterMemorySectionFrame";

export const CharacterMemoryUsersLoading: FC = function CharacterMemoryUsersLoading() {
	return (
		// 引用了CharacterMemorySectionFrame组件，用于记忆区统一标题外壳
		<CharacterMemorySectionFrame>
			{/* 引用了Typography组件，用于调试用户列表加载态 */}
			<Typography variant="body2" color="text.secondary">
				加载调试用户…
			</Typography>
		</CharacterMemorySectionFrame>
	);
};
