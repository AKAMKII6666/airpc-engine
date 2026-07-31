/**
	* 故事包 BFF FS：包⊃章 列/读/写与缺 layout 安全回落。
	*/
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildDefaultCanvasLayout } from "@studio-v2/src/utils/server/packages/layout/defaultCanvasLayout.server";
import { listDiskStoryPackages } from "@studio-v2/src/utils/server/packages/list/packagesList.server";
import {
	createDiskStoryPackage,
	readDiskChapterBundle,
	readDiskStoryPackage,
	writeDiskChapterBundle,
} from "@studio-v2/src/utils/server/packages/fs/package/packagesFs.server";
import { writeValidatedDiskStoryPackage } from "@studio-v2/src/utils/server/packages/fs/validate/writeValidatedPackage.server";
import {
	chapterCardsDir,
	chapterConfPath,
	packageConfPath,
} from "@studio-v2/src/utils/server/packages/paths/packagesPaths.server";

const REPO_ROOT = path.join(__dirname, "../../../..");
const DATA_ROOT = path.join(REPO_ROOT, "data");

describe("buildDefaultCanvasLayout", () => {
	it("lays cards on a 3-column grid with derived agent lanes", () => {
		const layout = buildDefaultCanvasLayout(
			"demo_chapter",
			["a", "b", "c", "d"],
			["lanxing", "xiaopi"],
		);
		expect(layout.chapterId).toBe("demo_chapter");
		expect(layout.lanes).toEqual([
			{ agentId: "lanxing", order: 0 },
			{ agentId: "xiaopi", order: 1 },
		]);
		expect(layout.nodes).toHaveLength(4);
		expect(layout.nodes[0]).toMatchObject({ cardId: "a", x: 200, y: 120 });
		expect(layout.nodes[3]).toMatchObject({ cardId: "d", x: 200, y: 320 });
		expect(layout.edges).toEqual([]);
	});
});

describe("packagesFs against data/storis-packages", () => {
	const probeIds: string[] = [];

	afterEach(async () => {
		for (const id of probeIds.splice(0)) {
			await rm(path.join(DATA_ROOT, "storis-packages", id), {
				recursive: true,
				force: true,
			});
		}
	});

	it("lists golden_handoff and wrong_number_act1 from disk", async () => {
		const packages = await listDiskStoryPackages();
		const ids = packages.map(function (p) {
			return p.packageId;
		});
		expect(ids).toContain("golden_handoff");
		expect(ids).toContain("wrong_number_act1");
		const act1 = packages.find(function (p) {
			return p.packageId === "wrong_number_act1";
		});
		expect(act1?.title).toBe("第一幕：打错电话");
		expect(act1?.cardCount).toBe(3);
		expect(act1?.entryCardId).toBe("lanxing_wrong_number");
		expect(act1?.chapterCount).toBeGreaterThanOrEqual(1);
		expect(act1?.characterCount).toBe(1);
	});

	it("reads wrong_number_act1 entry chapter with three cards", async () => {
		const bundle = await readDiskStoryPackage("wrong_number_act1");
		expect(bundle.conf.chapterId).toBeTruthy();
		expect(bundle.conf.entryCardId).toBe("lanxing_wrong_number");
		expect(
			bundle.cards.map(function (c) {
				return c.cardId;
			}),
		).toEqual([
			"lanxing_wrong_number",
			"lanxing_callback_intro",
			"lanxing_voicemail",
		]);
		expect(bundle.layout.nodes.length).toBeGreaterThanOrEqual(3);
	});

	it("reads golden_handoff entry chapter", async () => {
		const bundle = await readDiskStoryPackage("golden_handoff");
		expect(bundle.conf.chapterId).toBe("golden_handoff");
		expect(bundle.cards.length).toBe(4);
		expect(bundle.layout.chapterId).toBe("golden_handoff");
	});

	it("chapter write roundtrips and drops orphan cards", async () => {
		const probeId = "studio_v2_bff_probe";
		probeIds.push(probeId);
		await createDiskStoryPackage({
			packageId: probeId,
			title: "BFF 探针包",
			withStartCard: false,
		});

		const cardA = {
			cardId: "probe_card_a",
			cardKind: "story" as const,
			title: "探针 A",
			ownerAgentId: "lanxing",
			exits: [],
		};
		const cardB = {
			cardId: "probe_card_b",
			cardKind: "story" as const,
			title: "探针 B",
			ownerAgentId: "lanxing",
			exits: [],
		};

		const written = await writeDiskChapterBundle(probeId, probeId, {
			conf: {
				schemaVersion: 1,
				chapterId: probeId,
				title: "BFF 探针包",
				participants: ["lanxing"],
				entryCardId: "probe_card_a",
				cards: [{ cardId: "probe_card_a" }, { cardId: "probe_card_b" }],
			},
			cards: [cardA, cardB],
			layout: null,
		});

		expect(written.layout.nodes.length).toBeGreaterThanOrEqual(2);
		const reread = await readDiskChapterBundle(probeId, probeId);
		expect(
			reread.cards.map(function (c) {
				return c.cardId;
			}),
		).toEqual(["probe_card_a", "probe_card_b"]);

		const confText = await readFile(
			chapterConfPath(probeId, probeId),
			"utf8",
		);
		const confJson = JSON.parse(confText) as {
			chapterId: string;
			participants?: unknown;
		};
		expect(confJson.chapterId).toBe(probeId);
		expect(confJson.participants).toBeUndefined();
	});

	it("createDiskStoryPackage writes package.conf + chapter scaffold", async () => {
		const pkgId = "studio_v2_create_probe";
		probeIds.push(pkgId);
		const created = await createDiskStoryPackage({
			packageId: pkgId,
			title: "新建探针",
			description: "S8-17",
			withStartCard: true,
		});
		expect(created.conf.chapterId).toBe(pkgId);
		expect(created.conf.entryCardId).toMatch(/^card_[a-f0-9]{32}$/);
		expect(created.cards).toHaveLength(1);
		const pkgConf = JSON.parse(
			await readFile(packageConfPath(pkgId), "utf8"),
		) as { entryChapterId: string };
		expect(pkgConf.entryChapterId).toBe(pkgId);
	});

	it("writeValidatedDiskStoryPackage rolls back when validate has errors", async () => {
		const pkgId = "studio_v2_validate_gate";
		probeIds.push(pkgId);
		const card = {
			cardId: "gate_card",
			cardKind: "story" as const,
			title: "闸门卡",
			ownerAgentId: "lanxing",
			entryMode: "inbound_user_dial" as const,
			interactionMode: "realtime_dialogue" as const,
			context: { privateBrief: "", speakableBrief: "" },
			objectives: { requiredBeats: [] as string[] },
			toolPolicy: { mode: "inherit_free" as const },
			exits: [],
		};
		await createDiskStoryPackage({
			packageId: pkgId,
			title: "校验前标题",
			withStartCard: false,
		});
		await writeDiskChapterBundle(pkgId, pkgId, {
			conf: {
				schemaVersion: 1,
				chapterId: pkgId,
				title: "校验前标题",
				entryCardId: "gate_card",
				cards: [{ cardId: "gate_card" }],
			},
			cards: [card],
			layout: null,
		});

		const bad = await writeValidatedDiskStoryPackage(pkgId, {
			conf: {
				schemaVersion: 1,
				chapterId: pkgId,
				title: "坏包标题应回滚",
				entryCardId: "missing_entry_card",
				cards: [{ cardId: "gate_card" }],
			},
			cards: [card],
			layout: null,
		});
		expect(bad.ok).toBe(false);
		if (bad.ok) return;
		expect(bad.restored).toBe(true);

		const onDisk = await readDiskChapterBundle(pkgId, pkgId);
		expect(onDisk.conf.title).toBe("校验前标题");
		expect(onDisk.conf.entryCardId).toBe("gate_card");
	});
});
