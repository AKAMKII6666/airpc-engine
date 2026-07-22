/**
	* 磁盘整包 ↔ 画布图 roundtrip + 编辑接线落盘（wrong_number_act1 真包）。
	*/
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import type { Node } from "@xyflow/react";
import { afterEach, describe, expect, it } from "vitest";
import {
	applyChapterPropertyForm,
	toChapterPropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";
import {
	applyNodePropertyForm,
	toNodePropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/node/nodePropertyForm";
import {
	bundleToEditorGraph,
	editorGraphToBundle,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import { readCallCardData } from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import {
	readDiskStoryPackage,
	writeDiskStoryPackage,
} from "@studio-v2/src/utils/server/packages/fs/packagesFs.server";

const REPO_ROOT = path.join(__dirname, "../../../..");
const DATA_ROOT = path.join(REPO_ROOT, "data");

function patchNodeData<T extends Record<string, unknown>>(
	nodes: readonly Node[],
	nodeId: string,
	data: T,
): Node[] {
	return nodes.map(function (node) {
		if (node.id !== nodeId) return node;
		return { ...node, data };
	});
}

describe("diskBundleGraph", () => {
	const probeIds: string[] = [];

	afterEach(async function () {
		for (const id of probeIds.splice(0)) {
			await rm(path.join(DATA_ROOT, "storis-packages", id), {
				recursive: true,
				force: true,
			});
		}
	});

	it("opens wrong_number_act1 with entry card node and roundtrips layout", async () => {
		const bundle = await readDiskStoryPackage("wrong_number_act1");
		const seed = bundleToEditorGraph(bundle, {
			lanxing: { displayName: "澜星姐姐" },
			xiaopi: { displayName: "小皮" },
		});
		expect(seed.nodes.length).toBeGreaterThan(3);
		expect(seed.edges.length).toBeGreaterThan(0);
		expect(seed.initialSelectionNodeId).toBe("card_wrong_number");

		const roundtrip = editorGraphToBundle(bundle, seed.nodes, seed.edges);
		expect(roundtrip.conf.packageId).toBe("wrong_number_act1");
		expect(
			roundtrip.cards.map(function (c) {
				return c.cardId;
			}),
		).toEqual([
			"lanxing_wrong_number",
			"lanxing_callback_intro",
			"lanxing_voicemail",
		]);
		expect(roundtrip.layout.nodes.length).toBeGreaterThanOrEqual(3);
		expect(roundtrip.layout.edges?.length).toBeGreaterThan(0);
	});

	it("builds character anchors from bundle participants aligned to disk agentIds", async () => {
		const bundle = await readDiskStoryPackage("wrong_number_act1");
		const seed = bundleToEditorGraph(bundle, {
			lanxing: { displayName: "澜星姐姐" },
			xiaopi: { displayName: "小皮" },
		});
		const anchors = seed.nodes.filter(function (n) {
			return n.type === "characterAnchor";
		});
		expect(anchors.map(function (a) {
			return (a.data as { agentId: string }).agentId;
		})).toEqual(["lanxing", "xiaopi"]);
		expect(anchors[0]?.data).toMatchObject({
			agentId: "lanxing",
			displayName: "澜星姐姐",
			pendingCardCount: 3,
		});
	});

	it("persists float-panel card/chapter/owner edits through editorGraphToBundle", async () => {
		const bundle = await readDiskStoryPackage("wrong_number_act1");
		const seed = bundleToEditorGraph(bundle, {
			lanxing: { displayName: "澜星姐姐" },
			xiaopi: { displayName: "小皮" },
		});

		const cardNode = seed.nodes.find(function (n) {
			return n.id === "card_wrong_number";
		});
		expect(cardNode).toBeTruthy();
		const cardData = readCallCardData(cardNode);
		expect(cardData).toBeTruthy();

		const cardValues = toNodePropertyFormValues(cardData!);
		cardValues.title = "编辑后标题";
		cardValues.context.objective = "编辑后目标";
		cardValues.exits[0]!.title = "编辑出口";
		const editedCard = applyNodePropertyForm(cardData!, cardValues);
		editedCard.ownerAgentId = "xiaopi";
		editedCard.ownerDisplayName = "小皮";

		let nodes = patchNodeData(seed.nodes, "card_wrong_number", editedCard);

		const chapterNode = seed.nodes.find(function (n) {
			return n.id === "chapter_end";
		});
		expect(chapterNode).toBeTruthy();
		const chapterData = chapterNode!.data as {
			kind: string;
			title: string;
			summary: string;
		};
		const chapterValues = toChapterPropertyFormValues(chapterData as never);
		chapterValues.title = "编辑章节结束";
		chapterValues.summary = "编辑后 summary";
		const editedChapter = applyChapterPropertyForm(
			chapterData as never,
			chapterValues,
		);
		nodes = patchNodeData(nodes, "chapter_end", editedChapter);

		const saved = editorGraphToBundle(bundle, nodes, seed.edges);
		const wrong = saved.cards.find(function (c) {
			return c.cardId === "lanxing_wrong_number";
		});
		expect(wrong?.title).toBe("编辑后标题");
		expect(wrong?.context?.objective).toBe("编辑后目标");
		expect(wrong?.ownerAgentId).toBe("xiaopi");
		expect(wrong?.exits[0]?.title).toBe("编辑出口");
		expect(wrong?.exits[0]?.effects).toHaveLength(2);

		const endLayout = saved.layout.nodes.find(function (n) {
			return n.nodeId === "chapter_end";
		});
		expect(endLayout?.title).toBe("编辑章节结束");
		expect(endLayout?.summary).toBe("编辑后 summary");
	});

	it("whole-package write persists edited session graph to disk", async () => {
		const probeId = "studio_v2_edit_wiring_probe";
		probeIds.push(probeId);
		await mkdir(
			path.join(DATA_ROOT, "storis-packages", probeId, "cards"),
			{ recursive: true },
		);

		const source = await readDiskStoryPackage("wrong_number_act1");
		const seed = bundleToEditorGraph(source, {
			lanxing: { displayName: "澜星姐姐" },
		});
		const cardNode = seed.nodes.find(function (n) {
			return n.id === "card_callback";
		});
		const cardData = readCallCardData(cardNode);
		expect(cardData).toBeTruthy();
		const values = toNodePropertyFormValues(cardData!);
		values.title = "落盘探针标题";
		const edited = applyNodePropertyForm(cardData!, values);
		const nodes = patchNodeData(seed.nodes, "card_callback", edited);

		const bundle = editorGraphToBundle(source, nodes, seed.edges);
		bundle.conf = {
			...bundle.conf,
			packageId: probeId,
			title: "编辑接线探针包",
		};
		bundle.layout = { ...bundle.layout, packageId: probeId };

		await writeDiskStoryPackage(probeId, bundle);
		const reread = await readDiskStoryPackage(probeId);
		const callback = reread.cards.find(function (c) {
			return c.cardId === "lanxing_callback_intro";
		});
		expect(callback?.title).toBe("落盘探针标题");
		expect(reread.conf.title).toBe("编辑接线探针包");
	});
});
