/**
	* 角色归属 / 剧情出口连线处理（纯回调工厂）。
	*/
import type { Connection, Node } from "@xyflow/react";
import type { StoryEditorSelection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import {
	createAssignCharacterToSelection,
	createAssignOwnerToCallCard,
} from "../owner/canvasConnectOwnerCommands";
import type { SetEdges, SetNodes } from "./canvasConnectTypes";
import {
	createIsValidCanvasConnection,
	isExitOutboundBlocked,
} from "./canvasConnectValidators";
import { handleCanvasConnect } from "../special/handleCanvasConnect";

export {
	createAssignCharacterToSelection,
	createAssignOwnerToCallCard,
	createIsValidCanvasConnection,
	isExitOutboundBlocked,
};

/**
* 创建 onConnect：role 边；修饰键 attach 效果边；chapter_start 起点边；
* exit→chapter_end 自动补 end_story；禁止无出口 Handle 连章节结束；其余为剧情线。
*/
export function createCanvasOnConnect(args: {
	nodesRef: { current: Node[] };
	selectedIdRef: { current: string | null };
	setNodes: SetNodes;
	setEdges: SetEdges;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
	effectConnectArmedRef: { current: boolean };
}): (connection: Connection) => void {
	return function onCanvasConnect(connection: Connection): void {
		handleCanvasConnect({ ...args, connection });
	};
}
