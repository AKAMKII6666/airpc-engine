/**
	* 出口封死与 isValidConnection。
	*/
import type { Connection, Edge, Node } from "@xyflow/react";
import { exitBlocksOutboundConnect } from "@studio-v2/src/bis/pageBis/storyEditor/endStory/endStoryEdgeSync";
import { readCallCardData } from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";

/**
	* 出口已含 end_story 时禁止从该 Handle 再拖出任何新线（含剧情/挂载/再连结束）。
	* role 归属不受影响（sourceHandle=role）。
	*/
export function isExitOutboundBlocked(
	connection: Connection,
	nodes: readonly Node[],
): boolean {
	const { source, sourceHandle } = connection;
	if (!source || !sourceHandle || sourceHandle === "role") return false;
	const card = readCallCardData(nodes.find((n) => n.id === source));
	if (!card) return false;
	return exitBlocksOutboundConnect(card, sourceHandle);
}

/**
	* React Flow isValidConnection：与 onConnect 同一套出口封死规则。
	*/
export function createIsValidCanvasConnection(args: {
	nodesRef: { current: Node[] };
}): (connection: Connection | Edge) => boolean {
	const { nodesRef } = args;
	return (connection: Connection | Edge) => {
		return !isExitOutboundBlocked(
			connection as Connection,
			nodesRef.current,
		);
	};
}
