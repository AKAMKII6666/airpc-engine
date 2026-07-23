/**
	* packageAndAssetFloat / 包配置投影：磁盘 bundle 与资源表单复用回归。
	*/
import { describe, expect, it } from "vitest";
import { StoryPackageConfSchema } from "@airpc/rpg-engine";
import {
	buildPackageCardIndex,
	listChapterEntryCardOptions,
	listChapterNextPackageOptions,
	projectEditorPackageConfFromBundle,
	resolveChapterEntryCardId,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/packageConfProjection";
import {
	parsePackageMetaJson,
	parseWorldFactsJson,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/session/packageMetaJson";
import {
	withAssetRefs,
	withPackageMeta,
	withWorldFacts,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/session/packageSessionLoad";
import { buildNodeContextItems } from "@studio-v2/src/bis/pageBis/storyEditor/form/node/nodePropertyFormItems";
import { diskSummaryToPackageSummary } from "@studio-v2/src/bis/pageBis/packages/diskSummaryMapper";
import { readDiskStoryPackage } from "@studio-v2/src/utils/server/packages/fs/packagesFs.server";
import {
	CREATE_ASSET_FORM_ITEMS,
	CREATE_ASSET_INITIAL_VALUES,
	validateCreateAssetForm,
} from "@studio-v2/src/bis/pageBis/assets/createAssetForm";
import {
	ASSET_BASIC_ITEMS,
	ASSET_FILE_ITEMS,
} from "@studio-v2/src/bis/pageBis/assets/assetDetailForm";

describe("projectEditorPackageConfFromBundle", () => {
	it("projects StoryPackageConf-aligned readonly fields from wrong_number_act1 disk", async () => {
		const bundle = await readDiskStoryPackage("wrong_number_act1");
		const conf = projectEditorPackageConfFromBundle(bundle);
		expect(conf.schemaVersion).toBe(1);
		expect(conf.packageId).toBe("wrong_number_act1");
		expect(conf.title).toContain("打错电话");
		// V2-S8-11：participants 投影 = 本包派生引用（wrong_number_act1 → lanxing）
		expect(conf.participants).toEqual(["lanxing"]);
		expect(conf.entryCardId).toBe("lanxing_wrong_number");
		expect(conf.cards.map((c) => c.cardId)).toContain(
			"lanxing_wrong_number",
		);
	});

	it("lists chapter next-package and entry-card Select options from disk index", async () => {
		const act1 = await readDiskStoryPackage("wrong_number_act1");
		const golden = await readDiskStoryPackage("golden_handoff");
		const { cardIndex, entryCardIdByPackage } = buildPackageCardIndex([
			act1,
			golden,
		]);
		const summaries = [act1, golden].map(function (b) {
			return diskSummaryToPackageSummary({
				packageId: b.conf.packageId,
				title: b.conf.title ?? b.conf.packageId,
				schemaVersion: b.conf.schemaVersion,
				cardCount: b.conf.cards.length,
				characterCount: projectEditorPackageConfFromBundle(b)
					.participants.length,
				assetCount: b.conf.assetRefs?.length ?? 0,
				entryCardId: b.conf.entryCardId ?? "",
				lastEditedAt: "",
			});
		});
		expect(summaries[0]?.characterCount).toBe(1);
		const packages = listChapterNextPackageOptions(summaries);
		expect(packages.some((p) => p.value === "golden_handoff")).toBe(true);
		expect(listChapterEntryCardOptions(undefined, cardIndex)).toEqual([]);
		expect(listChapterEntryCardOptions("", cardIndex)).toEqual([]);
		const goldenCards = listChapterEntryCardOptions(
			"golden_handoff",
			cardIndex,
		);
		expect(goldenCards.length).toBeGreaterThan(0);
		expect(
			resolveChapterEntryCardId(
				"golden_handoff",
				"missing",
				cardIndex,
				entryCardIdByPackage,
			),
		).toBe(entryCardIdByPackage.golden_handoff);
	});
});

describe("storyEditor asset form reuse", () => {
	it("create form items come from assets bis (no duplicate field set)", () => {
		expect(CREATE_ASSET_FORM_ITEMS.map((i) => i.name)).toEqual([
			"displayName",
			"kind",
			"note",
		]);
		expect(validateCreateAssetForm({ ...CREATE_ASSET_INITIAL_VALUES }).displayName).toBe(
			"请填写资源名",
		);
	});

	it("edit form items reuse asset detail basic + file segments", () => {
		const names = [...ASSET_BASIC_ITEMS, ...ASSET_FILE_ITEMS].map((i) => i.name);
		expect(names).toContain("displayName");
		expect(names).toContain("availability");
		expect(names).toContain("measureValueText");
	});
});

describe("V2-S8-13 asset refs from API", () => {
	it("buildNodeContextItems uses Select for playbackClipId with clip options", () => {
		const items = buildNodeContextItems([
			{ value: "clip_hello", label: "样例开场音" },
		]);
		const playback = items.find((i) => i.name === "context.playbackClipId");
		expect(playback?.comType).toBe("Select");
		expect(playback?.options?.some((o) => o.value === "clip_hello")).toBe(
			true,
		);
		expect(playback?.options?.some((o) => o.value === "")).toBe(true);
	});

	it("withAssetRefs dedupes and clears empty refs on disk bundle", async () => {
		const bundle = await readDiskStoryPackage("wrong_number_act1");
		const next = withAssetRefs(bundle, [
			"clip_hello",
			"clip_hello",
			"  ",
			"clip_b",
		]);
		expect(next.conf.assetRefs).toEqual(["clip_hello", "clip_b"]);
		const cleared = withAssetRefs(next, []);
		expect(cleared.conf.assetRefs).toBeUndefined();
	});
});

describe("V2-S8-15 package worldFacts / meta JSON", () => {
	it("parses worldFacts and meta drafts; rejects invalid shapes", () => {
		const factsOk = parseWorldFactsJson(
			'[{"factId":"knows_lanxing","note":"demo"}]',
		);
		expect(factsOk.ok).toBe(true);
		if (factsOk.ok) {
			expect(factsOk.value?.[0]?.factId).toBe("knows_lanxing");
		}
		expect(parseWorldFactsJson("[]").ok).toBe(true);
		const emptyFacts = parseWorldFactsJson("[]");
		expect(emptyFacts.ok && emptyFacts.value === undefined).toBe(true);
		expect(parseWorldFactsJson('{"factId":"x"}').ok).toBe(false);
		expect(parseWorldFactsJson("not-json").ok).toBe(false);

		const metaOk = parsePackageMetaJson(
			'{"imports":{"facts":["a"]},"exports":{"facts":["b"]}}',
		);
		expect(metaOk.ok).toBe(true);
		if (metaOk.ok) {
			expect(metaOk.value?.imports?.facts).toEqual(["a"]);
			expect(metaOk.value?.exports?.facts).toEqual(["b"]);
		}
		expect(parsePackageMetaJson("{}").ok).toBe(true);
		expect(parsePackageMetaJson("[]").ok).toBe(false);
	});

	it("withWorldFacts / withPackageMeta write and clear session conf", async () => {
		const bundle = await readDiskStoryPackage("wrong_number_act1");
		const withFacts = withWorldFacts(bundle, [
			{ factId: "act1_premise" },
		]);
		expect(withFacts.conf.worldFacts).toEqual([{ factId: "act1_premise" }]);
		const clearedFacts = withWorldFacts(withFacts, undefined);
		expect(clearedFacts.conf.worldFacts).toBeUndefined();

		const withMeta = withPackageMeta(bundle, {
			imports: { facts: ["shared_lore"] },
			exports: { facts: ["act1_done"] },
		});
		expect(withMeta.conf.meta?.imports?.facts).toEqual(["shared_lore"]);
		expect(withMeta.conf.meta?.exports?.facts).toEqual(["act1_done"]);
		const clearedMeta = withPackageMeta(withMeta, undefined);
		expect(clearedMeta.conf.meta).toBeUndefined();
	});

	it("StoryPackageConfSchema keeps worldFacts and meta through parse", () => {
		const parsed = StoryPackageConfSchema.safeParse({
			schemaVersion: 1,
			packageId: "meta_pkg",
			cards: [],
			worldFacts: [{ factId: "f1", type: "bool" }],
			meta: {
				conflictsWith: ["other"],
				imports: { facts: ["in"] },
				exports: { facts: ["out"] },
			},
		});
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.data.worldFacts?.[0]?.factId).toBe("f1");
		expect(parsed.data.meta?.imports?.facts).toEqual(["in"]);
		expect(parsed.data.meta?.exports?.facts).toEqual(["out"]);
		expect(parsed.data.meta?.conflictsWith).toEqual(["other"]);
	});
});
