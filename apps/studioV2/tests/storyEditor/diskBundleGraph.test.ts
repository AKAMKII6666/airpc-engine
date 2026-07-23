/**
	* 磁盘整包 ↔ 画布图 roundtrip + 编辑接线落盘（wrong_number_act1 真包）。
	*/
import { access, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import type { Node } from "@xyflow/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	applyChapterPropertyForm,
	toChapterPropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";
import {
	applyNodePropertyForm,
	toNodePropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/node/nodePropertyForm";
import {
	appendPlacedNodeSelected,
	createDockPlacementNode,
	removeNodeAndIncidentEdges,
} from "@studio-v2/src/bis/pageBis/storyEditor/dock/dockNodeFactory";
import {
	bundleToEditorGraph,
	editorGraphToBundle,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import { readCallCardData } from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import {
	readDiskStoryPackage,
	writeDiskStoryPackage,
} from "@studio-v2/src/utils/server/packages/fs/packagesFs.server";
import { resetStudioIdSeq } from "@studio-v2/typeFiles/ids/createStudioId";

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

	beforeEach(function () {
		resetStudioIdSeq(0);
	});

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
		expect(roundtrip.conf.participants).toEqual([]);
		expect(roundtrip.layout.lanes).toEqual([
			{ agentId: "lanxing", order: 0 },
		]);
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

	it("builds character anchors from full character library (V2-S8-10)", async () => {
		const bundle = await readDiskStoryPackage("wrong_number_act1");
		/** 正式五人；打开包时由 fetchCharacterDefs 注入，测试直接传 lookup */
		const formalCastNames = {
			lanxing: { displayName: "澜星姐姐" },
			xiaopi: { displayName: "小皮" },
			"qiang-shushu": { displayName: "强叔叔" },
			"zhang-boss": { displayName: "张老板" },
			"bai-bansian": { displayName: "白半仙" },
		};
		const seed = bundleToEditorGraph(bundle, formalCastNames);
		const anchors = seed.nodes.filter(function (n) {
			return n.type === "characterAnchor";
		});
		expect(anchors.map(function (a) {
			return (a.data as { agentId: string }).agentId;
		})).toEqual([
			"lanxing",
			"xiaopi",
			"qiang-shushu",
			"zhang-boss",
			"bai-bansian",
		]);
		expect(anchors[0]?.data).toMatchObject({
			agentId: "lanxing",
			displayName: "澜星姐姐",
			pendingCardCount: 3,
			statusLabel: "本包 · 3 卡",
		});
		expect(anchors[1]?.data).toMatchObject({
			agentId: "xiaopi",
			pendingCardCount: 0,
			statusLabel: "本章未挂卡",
		});
		expect(anchors[2]?.data).toMatchObject({
			pendingCardCount: 0,
			statusLabel: "本章未挂卡",
		});
	});

	it("falls back to layout.lanes when character library lookup is empty", async () => {
		const bundle = await readDiskStoryPackage("wrong_number_act1");
		const seed = bundleToEditorGraph(bundle, {});
		const anchors = seed.nodes.filter(function (n) {
			return n.type === "characterAnchor";
		});
		expect(anchors.map(function (a) {
			return (a.data as { agentId: string }).agentId;
		})).toEqual(["lanxing", "xiaopi"]);
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

	it("writes edited exit.condition through form → editorGraphToBundle (V2-S8-8)", async () => {
		const bundle = await readDiskStoryPackage("wrong_number_act1");
		const seed = bundleToEditorGraph(bundle, {
			lanxing: { displayName: "澜星姐姐" },
		});
		const cardNode = seed.nodes.find(function (n) {
			return n.id === "card_wrong_number";
		});
		const cardData = readCallCardData(cardNode);
		expect(cardData).toBeTruthy();
		const values = toNodePropertyFormValues(cardData!);
		values.objectives.requiredBeats = ["beat_intro", "beat_done"];
		values.exits[0] = {
			...values.exits[0]!,
			condition: { op: "beat_completed", beatId: "beat_intro" },
			conditionSummary: "节拍已完成 · beat_intro",
		};
		const edited = applyNodePropertyForm(cardData!, values);
		expect(edited.exits[0]?.condition).toEqual({
			op: "beat_completed",
			beatId: "beat_intro",
		});
		const nodes = patchNodeData(seed.nodes, "card_wrong_number", edited);
		const saved = editorGraphToBundle(bundle, nodes, seed.edges);
		const wrong = saved.cards.find(function (c) {
			return c.cardId === "lanxing_wrong_number";
		});
		expect(wrong?.exits[0]?.condition).toEqual({
			op: "beat_completed",
			beatId: "beat_intro",
		});
		expect(wrong?.objectives?.requiredBeats).toEqual([
			"beat_intro",
			"beat_done",
		]);
	});

	it("preserves nested exit.condition when only title changes (V2-S8-8)", async () => {
		const bundle = await readDiskStoryPackage("wrong_number_act1");
		const seed = bundleToEditorGraph(bundle, {
			lanxing: { displayName: "澜星姐姐" },
		});
		const cardNode = seed.nodes.find(function (n) {
			return n.id === "card_callback";
		});
		const cardData = readCallCardData(cardNode);
		expect(cardData).toBeTruthy();
		const originalNested = cardData!.exits[0]?.condition;
		expect(originalNested?.op).toBe("and");

		const values = toNodePropertyFormValues(cardData!);
		values.title = "仅改标题";
		// 模拟表单丢 condition：写盘须回落 base，禁止 DEFAULT 覆盖嵌套
		values.exits[0] = {
			...values.exits[0]!,
			condition: undefined,
			conditionSummary: "假摘要",
		};
		const edited = applyNodePropertyForm(cardData!, values);
		expect(edited.exits[0]?.condition).toBeUndefined();
		const nodes = patchNodeData(seed.nodes, "card_callback", edited);
		const saved = editorGraphToBundle(bundle, nodes, seed.edges);
		const callback = saved.cards.find(function (c) {
			return c.cardId === "lanxing_callback_intro";
		});
		expect(callback?.title).toBe("仅改标题");
		expect(callback?.exits[0]?.condition).toEqual(originalNested);
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

	it("dock-placed CallCard appends conf.cards and writes s-card on save (V2-S8-4)", async () => {
		const probeId = "studio_v2_new_card_probe";
		probeIds.push(probeId);
		await mkdir(
			path.join(DATA_ROOT, "storis-packages", probeId, "cards"),
			{ recursive: true },
		);

		const source = await readDiskStoryPackage("wrong_number_act1");
		const seed = bundleToEditorGraph(source, {
			lanxing: { displayName: "澜星姐姐" },
		});
		const placed = createDockPlacementNode("story", { x: 420, y: 180 });
		expect(placed).not.toBeNull();
		const newCardId = readCallCardData(placed!)?.cardId;
		expect(newCardId).toBeTruthy();
		expect(source.conf.cards.map((c) => c.cardId)).not.toContain(newCardId);

		const nodes = appendPlacedNodeSelected(seed.nodes, placed!);
		const bundle = editorGraphToBundle(source, nodes, seed.edges);
		expect(bundle.conf.cards.map((c) => c.cardId)).toEqual([
			"lanxing_wrong_number",
			"lanxing_callback_intro",
			"lanxing_voicemail",
			newCardId,
		]);
		const created = bundle.cards.find(function (c) {
			return c.cardId === newCardId;
		});
		expect(created?.title).toBe("新通话卡");
		expect(created?.cardKind).toBe("story");

		bundle.conf = {
			...bundle.conf,
			packageId: probeId,
			title: "新建卡探针包",
		};
		bundle.layout = { ...bundle.layout, packageId: probeId };
		await writeDiskStoryPackage(probeId, bundle);

		const cardPath = path.join(
			DATA_ROOT,
			"storis-packages",
			probeId,
			"cards",
			`${newCardId}.s-card.json`,
		);
		await access(cardPath);
		const reread = await readDiskStoryPackage(probeId);
		expect(reread.conf.cards.map((c) => c.cardId)).toContain(newCardId);
		expect(
			reread.cards.find(function (c) {
				return c.cardId === newCardId;
			})?.title,
		).toBe("新通话卡");
		const reopen = bundleToEditorGraph(reread, {
			lanxing: { displayName: "澜星姐姐" },
		});
		expect(
			reopen.nodes.some(function (n) {
				return readCallCardData(n)?.cardId === newCardId;
			}),
		).toBe(true);
	});

	it("canvas delete removes conf.cards and unlinks s-card on save (V2-S8-5)", async () => {
		const probeId = "studio_v2_delete_card_probe";
		probeIds.push(probeId);

		const source = await readDiskStoryPackage("wrong_number_act1");
		const seed = bundleToEditorGraph(source, {
			lanxing: { displayName: "澜星姐姐" },
		});
		const removedCardId = "lanxing_voicemail";
		const removeNode = seed.nodes.find(function (n) {
			return readCallCardData(n)?.cardId === removedCardId;
		});
		expect(removeNode).toBeTruthy();
		const afterDelete = removeNodeAndIncidentEdges(
			seed.nodes,
			seed.edges,
			removeNode!.id,
		);

		const bundle = editorGraphToBundle(
			source,
			afterDelete.nodes,
			afterDelete.edges,
		);
		expect(bundle.conf.cards.map((c) => c.cardId)).toEqual([
			"lanxing_wrong_number",
			"lanxing_callback_intro",
		]);
		expect(
			bundle.cards.map(function (c) {
				return c.cardId;
			}),
		).not.toContain(removedCardId);
		expect(bundle.conf.entryCardId).toBe("lanxing_wrong_number");

		bundle.conf = {
			...bundle.conf,
			packageId: probeId,
			title: "删卡探针包",
		};
		bundle.layout = { ...bundle.layout, packageId: probeId };
		await writeDiskStoryPackage(probeId, {
			conf: {
				...source.conf,
				packageId: probeId,
				title: "删卡探针包",
				cards: source.conf.cards,
				entryCardId: source.conf.entryCardId,
			},
			cards: source.cards,
			layout: { ...source.layout, packageId: probeId },
		});
		const preDeletePath = path.join(
			DATA_ROOT,
			"storis-packages",
			probeId,
			"cards",
			`${removedCardId}.s-card.json`,
		);
		await access(preDeletePath);

		await writeDiskStoryPackage(probeId, bundle);
		await expect(access(preDeletePath)).rejects.toThrow();
		const reread = await readDiskStoryPackage(probeId);
		expect(reread.conf.cards.map((c) => c.cardId)).toEqual([
			"lanxing_wrong_number",
			"lanxing_callback_intro",
		]);
		expect(
			reread.cards.map(function (c) {
				return c.cardId;
			}),
		).not.toContain(removedCardId);
	});

	it("deleting entry card force-retargets entryCardId to first remaining (V2-S8-5)", async () => {
		const source = await readDiskStoryPackage("wrong_number_act1");
		expect(source.conf.entryCardId).toBe("lanxing_wrong_number");
		const seed = bundleToEditorGraph(source, {
			lanxing: { displayName: "澜星姐姐" },
		});
		const entryNode = seed.nodes.find(function (n) {
			return readCallCardData(n)?.cardId === "lanxing_wrong_number";
		});
		expect(entryNode).toBeTruthy();
		const afterDelete = removeNodeAndIncidentEdges(
			seed.nodes,
			seed.edges,
			entryNode!.id,
		);
		const bundle = editorGraphToBundle(
			source,
			afterDelete.nodes,
			afterDelete.edges,
		);
		expect(bundle.conf.cards.map((c) => c.cardId)).toEqual([
			"lanxing_callback_intro",
			"lanxing_voicemail",
		]);
		expect(bundle.conf.entryCardId).toBe("lanxing_callback_intro");
	});

	it("preserves edited entryCardId when card still on canvas (V2-S8-6)", async () => {
		const source = await readDiskStoryPackage("wrong_number_act1");
		expect(source.conf.entryCardId).toBe("lanxing_wrong_number");
		const seed = bundleToEditorGraph(source, {
			lanxing: { displayName: "澜星姐姐" },
		});
		const withNewEntry = {
			...source,
			conf: {
				...source.conf,
				entryCardId: "lanxing_callback_intro",
			},
		};
		const bundle = editorGraphToBundle(
			withNewEntry,
			seed.nodes,
			seed.edges,
		);
		expect(bundle.conf.entryCardId).toBe("lanxing_callback_intro");
	});

	it("effect.critical survives projection roundtrip (V2-S8-6)", async () => {
		const source = await readDiskStoryPackage("wrong_number_act1");
		const seed = bundleToEditorGraph(source, {
			lanxing: { displayName: "澜星姐姐" },
		});
		const cardNode = seed.nodes.find(function (n) {
			return readCallCardData(n)?.cardId === "lanxing_wrong_number";
		});
		expect(cardNode).toBeTruthy();
		const card = readCallCardData(cardNode!)!;
		const exit0 = card.exits[0];
		expect(exit0?.effects[0]).toBeTruthy();
		const patchedEffects = exit0.effects.map(function (fx, i) {
			if (i !== 0) return fx;
			return { ...fx, critical: true };
		});
		const patchedExits = card.exits.map(function (ex, i) {
			if (i !== 0) return ex;
			return { ...ex, effects: patchedEffects };
		});
		const patchedCard = { ...card, exits: patchedExits };
		const nodes = patchNodeData(seed.nodes, cardNode!.id, patchedCard);
		const bundle = editorGraphToBundle(source, nodes, seed.edges);
		const saved = bundle.cards.find(function (c) {
			return c.cardId === "lanxing_wrong_number";
		});
		expect(saved?.exits[0]?.effects[0]?.critical).toBe(true);

		const reopen = bundleToEditorGraph(bundle, {
			lanxing: { displayName: "澜星姐姐" },
		});
		const reopened = readCallCardData(
			reopen.nodes.find(function (n) {
				return readCallCardData(n)?.cardId === "lanxing_wrong_number";
			})!,
		);
		expect(reopened?.exits[0]?.effects[0]?.critical).toBe(true);
	});

	it("exitKind/priority/condition/critical survive form → bundle roundtrip (V2-S8-9)", async () => {
		const source = await readDiskStoryPackage("wrong_number_act1");
		const seed = bundleToEditorGraph(source, {
			lanxing: { displayName: "澜星姐姐" },
		});
		const cardNode = seed.nodes.find(function (n) {
			return n.id === "card_wrong_number";
		});
		const cardData = readCallCardData(cardNode);
		expect(cardData).toBeTruthy();
		const values = toNodePropertyFormValues(cardData!);
		values.exits[0] = {
			...values.exits[0]!,
			exitKind: "terminal",
			priority: 88,
			condition: {
				op: "outcome_flag",
				flag: "answered_completed",
				equals: true,
			},
			conditionSummary: "人话预览，不替代 condition",
			effects: (values.exits[0]?.effects ?? []).map(function (fx, i) {
				if (i !== 0) return fx;
				return { ...fx, critical: true };
			}),
		};
		const edited = applyNodePropertyForm(cardData!, values);
		expect(edited.exits[0]?.exitKind).toBe("terminal");
		expect(edited.exits[0]?.priority).toBe(88);
		expect(edited.exits[0]?.condition).toEqual({
			op: "outcome_flag",
			flag: "answered_completed",
			equals: true,
		});
		expect(edited.exits[0]?.effects[0]?.critical).toBe(true);

		const nodes = patchNodeData(seed.nodes, "card_wrong_number", edited);
		const bundle = editorGraphToBundle(source, nodes, seed.edges);
		const saved = bundle.cards.find(function (c) {
			return c.cardId === "lanxing_wrong_number";
		});
		expect(saved?.exits[0]?.exitKind).toBe("terminal");
		expect(saved?.exits[0]?.priority).toBe(88);
		expect(saved?.exits[0]?.condition).toEqual({
			op: "outcome_flag",
			flag: "answered_completed",
			equals: true,
		});
		expect(saved?.exits[0]?.effects[0]?.critical).toBe(true);

		const reopen = bundleToEditorGraph(bundle, {
			lanxing: { displayName: "澜星姐姐" },
		});
		const reopened = readCallCardData(
			reopen.nodes.find(function (n) {
				return n.id === "card_wrong_number";
			})!,
		);
		expect(reopened?.exits[0]?.exitKind).toBe("terminal");
		expect(reopened?.exits[0]?.priority).toBe(88);
		expect(reopened?.exits[0]?.condition).toEqual({
			op: "outcome_flag",
			flag: "answered_completed",
			equals: true,
		});
		expect(reopened?.exits[0]?.effects[0]?.critical).toBe(true);
	});
});
