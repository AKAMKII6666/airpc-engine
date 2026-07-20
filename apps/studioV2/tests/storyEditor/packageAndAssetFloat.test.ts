/**
	* 包配置投影 / 资源浮窗复用 assets bis 的轻量回归。
	*/
import { describe, expect, it } from "vitest";
import {
	listChapterEntryCardOptions,
	listChapterNextPackageOptions,
	projectEditorPackageConf,
	resolveChapterEntryCardId,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/packageConfProjection";
import {
	CREATE_ASSET_FORM_ITEMS,
	CREATE_ASSET_INITIAL_VALUES,
	validateCreateAssetForm,
} from "@studio-v2/src/bis/pageBis/assets/createAssetForm";
import {
	ASSET_BASIC_ITEMS,
	ASSET_FILE_ITEMS,
} from "@studio-v2/src/bis/pageBis/assets/assetDetailForm";

describe("projectEditorPackageConf", () => {
	it("projects StoryPackageConf-aligned readonly fields from mock", () => {
		const conf = projectEditorPackageConf("pkg_memory_bar_1");
		expect(conf.schemaVersion).toBe(1);
		expect(conf.packageId).toBe("pkg_memory_bar_1");
		expect(conf.title).toContain("内存条");
		expect(conf.participants.length).toBeGreaterThan(0);
		expect(conf.entryCardId).toBe("doubao_intro_outbound");
		expect(conf.assetRefs.length).toBeGreaterThan(0);
		expect(conf.cards.map((c) => c.cardId)).toContain(
			"doubao_intro_outbound",
		);
	});

	it("falls back title when packageId unknown", () => {
		const conf = projectEditorPackageConf("pkg_unknown_x");
		expect(conf.packageId).toBe("pkg_unknown_x");
		expect(conf.title).toBe("未命名故事包");
		expect(conf.cards.length).toBeGreaterThan(0);
	});

	it("lists chapter next-package and entry-card Select options", () => {
		const packages = listChapterNextPackageOptions();
		expect(packages.some((p) => p.value === "pkg_night_shift_2")).toBe(true);
		expect(listChapterEntryCardOptions(undefined)).toEqual([]);
		expect(listChapterEntryCardOptions("")).toEqual([]);
		const nightCards = listChapterEntryCardOptions("pkg_night_shift_2");
		expect(nightCards.map((c) => c.value)).toContain("night_shift_open");
		expect(resolveChapterEntryCardId("pkg_night_shift_2", "missing")).toBe(
			"night_shift_open",
		);
		expect(
			resolveChapterEntryCardId("pkg_night_shift_2", "night_handoff_check"),
		).toBe("night_handoff_check");
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
