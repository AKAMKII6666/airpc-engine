/**
	* CallCard 归属角色 Select：与顶口 role 边即时双向同步。
	* 从 NodePropertyForm 拆出以降有效行数。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { CharacterAnchorNodeData } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export type CallCardOwnerSelectProps = {
	/** 当前归属 agentId；空串表示未绑定 */
	ownerAgentId: string;
	/** 画布角色锚点选项 */
	characterAnchors: readonly CharacterAnchorNodeData[];
	/** 变更即时写回；空串清空归属与 role 边 */
	onAssignOwner: (agentId: string, displayName: string) => void;
};

export const CallCardOwnerSelect: FC<CallCardOwnerSelectProps> =
	function CallCardOwnerSelect({
		// ownerAgentId 是当前归属 agentId，用于 Select value
		ownerAgentId,
		// characterAnchors 是画布锚点列表，用于选项
		characterAnchors,
		// onAssignOwner 是归属写回回调，用于即时同步 role 边
		onAssignOwner,
	}) {
		return (
			// 引用了TextField组件，用于归属角色 Select
			<TextField
				size="small"
				fullWidth
				select
				label="归属角色"
				value={ownerAgentId}
				onChange={(e) => {
					const agentId = e.target.value;
					if (agentId === "") {
						onAssignOwner("", "");
						return;
					}
					const anchor = characterAnchors.find(
						(a) => a.agentId === agentId,
					);
					onAssignOwner(agentId, anchor?.displayName ?? agentId);
				}}
				helperText="与顶口角色连线同步；选空则拆归属线。"
			>
				{/* 引用了MenuItem组件，用于清空归属 */}
				<MenuItem value="">（未绑定）</MenuItem>
				{characterAnchors.map((anchor) => (
					// 引用了MenuItem组件，用于角色归属选项
					<MenuItem key={anchor.agentId} value={anchor.agentId}>
						{anchor.displayName}
					</MenuItem>
				))}
			</TextField>
		);
	};
