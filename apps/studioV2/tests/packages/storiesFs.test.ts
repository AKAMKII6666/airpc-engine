/**
	* 故事包 BFF FS：列/读/整包写与缺 layout 安全回落。
	*/
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildDefaultCanvasLayout } from "@studio-v2/src/utils/server/packages/layout/defaultCanvasLayout.server";
import { listDiskStoryPackages } from "@studio-v2/src/utils/server/packages/list/packagesList.server";
import {
	readDiskStoryPackage,
	writeDiskStoryPackage,
} from "@studio-v2/src/utils/server/packages/fs/packagesFs.server";

const REPO_ROOT = path.join(__dirname, "../../../..");
const DATA_ROOT = path.join(REPO_ROOT, "data");

describe("buildDefaultCanvasLayout", () => {
	it("lays cards on a 3-column grid with participant lanes", () => {
		const layout = buildDefaultCanvasLayout(
			"demo_pkg",
			["a", "b", "c", "d"],
			["lanxing", "xiaopi"],
		);
		expect(layout.packageId).toBe("demo_pkg");
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
	});

	it("reads wrong_number_act1 with three cards and existing layout", async () => {
		const bundle = await readDiskStoryPackage("wrong_number_act1");
		expect(bundle.conf.packageId).toBe("wrong_number_act1");
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
		expect(
			bundle.layout.edges?.some(function (e) {
				return e.edgeKind === "effect";
			}),
		).toBe(true);
	});

	it("reads golden_handoff compatible bundle", async () => {
		const bundle = await readDiskStoryPackage("golden_handoff");
		expect(bundle.conf.packageId).toBe("golden_handoff");
		expect(bundle.cards.length).toBe(4);
		expect(bundle.layout.packageId).toBe("golden_handoff");
	});

	it("whole-package write roundtrips and drops orphan cards", async () => {
		const probeId = "studio_v2_bff_probe";
		probeIds.push(probeId);
		const dir = path.join(DATA_ROOT, "storis-packages", probeId);
		await mkdir(path.join(dir, "cards"), { recursive: true });

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
		const orphan = {
			cardId: "probe_orphan",
			cardKind: "story" as const,
			title: "孤儿",
			ownerAgentId: "lanxing",
			exits: [],
		};

		await writeFile(
			path.join(dir, "cards", "probe_orphan.s-card.json"),
			JSON.stringify(orphan, null, 2) + "\n",
			"utf8",
		);

		const written = await writeDiskStoryPackage(probeId, {
			conf: {
				schemaVersion: 1,
				packageId: probeId,
				title: "BFF 探针包",
				participants: ["lanxing"],
				entryCardId: "probe_card_a",
				cards: [{ cardId: "probe_card_a" }, { cardId: "probe_card_b" }],
			},
			cards: [cardA, cardB],
			layout: null,
		});

		expect(written.layout.nodes).toHaveLength(2);
		expect(written.conf.title).toBe("BFF 探针包");

		const reread = await readDiskStoryPackage(probeId);
		expect(
			reread.cards.map(function (c) {
				return c.cardId;
			}),
		).toEqual(["probe_card_a", "probe_card_b"]);

		const orphanPath = path.join(dir, "cards", "probe_orphan.s-card.json");
		await expect(readFile(orphanPath, "utf8")).rejects.toThrow();

		const confText = await readFile(
			path.join(dir, "story.conf.json"),
			"utf8",
		);
		expect(JSON.parse(confText).packageId).toBe(probeId);
	});

	it("falls back to default layout when canvas.layout.json missing", async () => {
		const pkgId = "studio_v2_layout_fallback";
		probeIds.push(pkgId);
		const pkgDir = path.join(DATA_ROOT, "storis-packages", pkgId);
		await mkdir(path.join(pkgDir, "cards"), { recursive: true });
		const card = {
			cardId: "only_card",
			cardKind: "story" as const,
			title: "仅一卡",
			ownerAgentId: "lanxing",
			exits: [],
		};
		await writeFile(
			path.join(pkgDir, "story.conf.json"),
			JSON.stringify(
				{
					schemaVersion: 1,
					packageId: pkgId,
					title: "缺 layout",
					participants: ["lanxing"],
					entryCardId: "only_card",
					cards: [{ cardId: "only_card" }],
				},
				null,
				2,
			) + "\n",
			"utf8",
		);
		await writeFile(
			path.join(pkgDir, "cards", "only_card.s-card.json"),
			JSON.stringify(card, null, 2) + "\n",
			"utf8",
		);

		const bundle = await readDiskStoryPackage(pkgId);
		expect(bundle.layout.note).toContain("缺省 layout");
		expect(bundle.layout.nodes[0]).toMatchObject({
			cardId: "only_card",
			x: 200,
			y: 120,
		});
	});
});
