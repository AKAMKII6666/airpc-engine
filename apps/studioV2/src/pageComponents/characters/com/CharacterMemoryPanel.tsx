/**
	* 角色详情记忆只读区：按调试 userId + 当前 agentId 查 Memory；列表 + 分页。
	* 无写口，不进角色 JSON。调试 userId 来自 data/users，不走 mock。
	*/
"use client";

import type { FC } from "react";
import { CharacterMemoryMainBody } from "./memory/CharacterMemoryMainBody";
import { CharacterMemoryNoUsers } from "./memory/CharacterMemoryNoUsers";
import { CharacterMemoryUsersError } from "./memory/CharacterMemoryUsersError";
import { CharacterMemoryUsersLoading } from "./memory/CharacterMemoryUsersLoading";
import { useCharacterMemoryPanel } from "./memory/hooks/useCharacterMemoryPanel";

export type CharacterMemoryPanelProps = {
	/** 当前角色 agentId；与 userId 组成记忆查询键 */
	agentId: string;
};

export const CharacterMemoryPanel: FC<CharacterMemoryPanelProps> =
	function CharacterMemoryPanel({
		// agentId 是当前角色键，用于只读查询 Memory
		agentId,
	}) {
		const memory = useCharacterMemoryPanel(agentId);

		if (memory.usersLoading) {
			// 引用了CharacterMemoryUsersLoading组件，用于调试用户加载态
			return <CharacterMemoryUsersLoading />;
		}

		if (memory.usersError) {
			// 引用了CharacterMemoryUsersError组件，用于调试用户加载错误
			return <CharacterMemoryUsersError message={memory.usersError} />;
		}

		if (memory.users.length === 0 || !memory.userId) {
			// 引用了CharacterMemoryNoUsers组件，用于无调试用户空态
			return <CharacterMemoryNoUsers />;
		}

		return (
			// 引用了CharacterMemoryMainBody组件，用于记忆列表与分页
			<CharacterMemoryMainBody
				users={memory.users}
				userId={memory.userId}
				onUserChange={memory.onUserChange}
				error={memory.error}
				loading={memory.loading}
				items={memory.items}
				page={memory.page}
				total={memory.total}
				onPageChange={memory.onPageChange}
			/>
		);
	};
