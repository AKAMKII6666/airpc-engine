/**
	* 新建 / 详情资源表单校验与 AssetMeta 投影轻量回归。
	* CRUD 真源为 /api/assets；本文件不测 HTTP。
	*/
import { describe, expect, it } from "vitest";
import {
	validateCreateAssetForm,
	CREATE_ASSET_INITIAL_VALUES,
} from "@studio-v2/src/bis/pageBis/assets/createAssetForm";
import {
	applyAssetDetailForm,
	toAssetDetailFormValues,
	validateAssetDetailForm,
} from "@studio-v2/src/bis/pageBis/assets/assetDetailForm";
import {
	assetMetaToSummary,
	buildAssetMetaFromCreateForm,
	mergeDetailFormIntoAssetMeta,
	resolveAssetAvailability,
	studioKindToEngineKind,
} from "@studio-v2/src/bis/pageBis/assets/assetMetaMapper";
import { resetStudioIdSeq } from "@studio-v2/typeFiles/ids/createStudioId";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";

describe("createAssetForm", () => {
	it("rejects empty displayName", () => {
		const errors = validateCreateAssetForm(CREATE_ASSET_INITIAL_VALUES);
		expect(errors.displayName).toBe("请填写资源名");
	});

	it("builds AssetMeta with system assetId and pendingFile", () => {
		resetStudioIdSeq(0);
		const assetId = createStudioId("asset", "试写音效");
		const meta = buildAssetMetaFromCreateForm(assetId, {
			displayName: " 试写音效 ",
			kind: "wav",
			note: "备注",
		});
		expect(meta.assetId).toBe(assetId);
		expect(meta.kind).toBe("wav");
		expect(meta.displayName).toBe("试写音效");
		expect(meta.uri.startsWith("files/")).toBe(true);
		expect(meta.meta?.pendingFile).toBe(true);
		expect(meta.meta?.note).toBe("备注");
		const summary = assetMetaToSummary(meta, {
			fileExists: false,
			lastEditedAt: "2026-07-22T00:00:00.000Z",
		});
		expect(summary.availability).toBe("unchecked");
		expect(summary.refCount).toBe(0);
	});
});

describe("assetDetailForm", () => {
	it("rejects empty displayName and bad measure text", () => {
		resetStudioIdSeq(10);
		const assetId = createStudioId("asset", "基线");
		const meta = buildAssetMetaFromCreateForm(assetId, {
			displayName: "基线",
			kind: "image",
			note: "",
		});
		const base = assetMetaToSummary(meta, {
			fileExists: false,
			lastEditedAt: "2026-07-22T00:00:00.000Z",
		});
		const values = toAssetDetailFormValues(base);
		values.displayName = "  ";
		values.measureValueText = "12.5";
		const errors = validateAssetDetailForm(values);
		expect(errors.displayName).toBe("请填写资源名");
		expect(errors.measureValueText).toBe("请填写非负整数，或留空");
	});

	it("applies type and note without changing assetId", () => {
		resetStudioIdSeq(20);
		const assetId = createStudioId("asset", "可编辑");
		const meta = buildAssetMetaFromCreateForm(assetId, {
			displayName: "可编辑",
			kind: "text",
			note: "旧备注",
		});
		const base = assetMetaToSummary(meta, {
			fileExists: false,
			lastEditedAt: "2026-07-22T00:00:00.000Z",
		});
		const values = toAssetDetailFormValues(base);
		values.note = "新备注";
		values.kind = "other";
		values.availability = "missing";
		values.measureValueText = "4096";
		values.measureUnit = "size_bytes";
		const next = applyAssetDetailForm(base, values);
		expect(next.assetId).toBe(base.assetId);
		expect(next.note).toBe("新备注");
		expect(next.kind).toBe("other");
		expect(next.availability).toBe("missing");
		expect(next.measureValue).toBe(4096);

		const merged = mergeDetailFormIntoAssetMeta(meta, values);
		expect(merged.assetId).toBe(assetId);
		expect(merged.meta?.note).toBe("新备注");
		expect(merged.meta?.studioKind).toBe("other");
		expect(studioKindToEngineKind("other")).toBe("prompt_clip");
	});
});

describe("asset availability", () => {
	it("maps file probe to ready / unchecked / missing", () => {
		expect(resolveAssetAvailability(true, true)).toBe("ready");
		expect(resolveAssetAvailability(false, true)).toBe("unchecked");
		expect(resolveAssetAvailability(false, false)).toBe("missing");
	});

	it("projects clip_hello-shaped meta as ready when file exists", () => {
		const summary = assetMetaToSummary(
			{
				assetId: "clip_hello",
				kind: "wav",
				uri: "files/clip_hello.wav",
				displayName: "样例开场音",
				durationMs: 0,
			},
			{ fileExists: true, lastEditedAt: "2026-07-22T00:00:00.000Z" },
		);
		expect(summary.assetId).toBe("clip_hello");
		expect(summary.kind).toBe("wav");
		expect(summary.availability).toBe("ready");
		expect(summary.measureUnit).toBe("duration_ms");
	});
});
