/**
	* packageAndAssetFloat / 包配置投影：磁盘 bundle 与资源表单复用回归。
	*/
import { describe, expect, it } from "vitest";
import {
	buildPackageCardIndex,
	listChapterEntryCardOptions,
	listChapterNextPackageOptions,
	projectEditorPackageConfFromBundle,
	resolveChapterEntryCardId,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/packageConfProjection";
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
		expect(conf.participants.length).toBeGreaterThan(0);
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
				characterCount: b.conf.participants.length,
				assetCount: b.conf.assetRefs?.length ?? 0,
				entryCardId: b.conf.entryCardId ?? "",
				lastEditedAt: "",
			});
		});
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
