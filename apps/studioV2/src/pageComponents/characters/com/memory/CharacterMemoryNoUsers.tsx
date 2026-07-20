/**
	* 记忆区无可用调试用户空态。
	*/
"use client";

import type { FC } from "react";
import { Typography } from "@mui/material";
import { CharacterMemorySectionFrame } from "./CharacterMemorySectionFrame";

export const CharacterMemoryNoUsers: FC = function CharacterMemoryNoUsers() {
	return (
		// 引用了CharacterMemorySectionFrame组件，用于记忆区统一标题外壳
		<CharacterMemorySectionFrame>
			{/* 引用了Typography组件，用于无调试用户空态 */}
			<Typography variant="body2" color="text.secondary">
				未选择调试用户。请先在用户档案中创建调试用户（data/users），再查看该角色记忆。
			</Typography>
		</CharacterMemorySectionFrame>
	);
};
