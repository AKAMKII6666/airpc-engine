/**
	* 新建故事包画布种子：强制 chapter_start + chapter_end；
	* 可选第一张通话卡并连到章节开始（= 编辑器起点卡 / entryCardId）。
	* 引擎忽略 layout；仅 Studio 画布使用。
	*/
import type { StudioCanvasLayout } from "@studio-v2/src/utils/server/types/diskStoryPackage.server";

const CHAPTER_START_ID = "chapter_start";
const CHAPTER_END_ID = "chapter_end";

/**
	* 新建包默认 layout。
	* entryCardId 有值时写入该卡节点，并建 chapter_start → 卡 的 story 边。
	*/
export function buildNewPackageCanvasLayout(args: {
	chapterId: string;
	/** 章节开始节点标题；通常取章名 */
	chapterTitle: string;
	/** 可选入口通话卡；有则落节点并连线 */
	entryCardId?: string;
}): StudioCanvasLayout {
	const { chapterId, chapterTitle, entryCardId } = args;
	const nodes: StudioCanvasLayout["nodes"] = [
		{
			nodeId: CHAPTER_START_ID,
			kind: "chapter_start",
			x: 200,
			y: 200,
			title: chapterTitle.trim() || "章节开始",
			summary: "",
		},
	];
	const edges: NonNullable<StudioCanvasLayout["edges"]> = [];

	if (entryCardId && entryCardId.trim() !== "") {
		const cardNodeId = `card_${entryCardId}`;
		nodes.push({
			nodeId: cardNodeId,
			cardId: entryCardId,
			x: 420,
			y: 200,
		});
		edges.push({
			edgeId: `e_start_${entryCardId}`,
			edgeKind: "story",
			source: CHAPTER_START_ID,
			target: cardNodeId,
			sourceHandle: "exit",
			targetHandle: "parent",
			label: "起点",
		});
	}

	nodes.push({
		nodeId: CHAPTER_END_ID,
		kind: "chapter_end",
		x: entryCardId ? 760 : 520,
		y: 200,
		title: "章节结束",
		summary: "",
	});

	return {
		schemaVersion: 1,
		chapterId,
		lanes: [],
		nodes,
		edges,
		note: "新建包种子：chapter_start 必有；引擎忽略本文件",
	};
}
