/**
	* 章节节点属性 Formik 契约（会话 mock）。
	* chapter_end：nextPackageId / nextEntryCardId 由 Select 写入；不写盘。
	* chapter_start：仅轻量 title / summary，不含下一包配置。
	*/
import type { FormikErrors } from "formik";
import type { EditorChapterNodeData } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import { resolveChapterEntryCardId } from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/packageConfProjection";

/** chapter_end 下拉用的磁盘卡索引；由编辑器会话注入 */
export type ChapterPackageDiskContext = {
	/** 包 id → 该包内可选下一入口卡列表；只读索引，来自磁盘 bundle */
	cardIndex: Readonly<
		Record<string, readonly { cardId: string; title?: string }[]>
	>;
	/** 包 id → 默认入口卡 cardId；无配置时由 resolveChapterEntryCardId 回落 */
	entryCardIdByPackage: Readonly<Record<string, string>>;
};

const EMPTY_CHAPTER_DISK_CTX: ChapterPackageDiskContext = {
	cardIndex: {},
	entryCardIdByPackage: {},
};

/** 章节属性浮窗 values；空串表示未选 */
export type ChapterPropertyFormValues = {
	/** 章节节点标题；必填 */
	title: string;
	/** 轻量摘要；可空 */
	summary: string;
	/** 下一故事包；仅 chapter_end 提交；空串=未选 */
	nextPackageId: string;
	/** 下一章起点卡；依赖 nextPackageId；空串=未选 */
	nextEntryCardId: string;
};

/** 将章节节点投影为 Formik 初始 values */
export function toChapterPropertyFormValues(
	data: EditorChapterNodeData,
): ChapterPropertyFormValues {
	return {
		title: data.title,
		summary: data.summary,
		nextPackageId: data.nextPackageId ?? "",
		nextEntryCardId: data.nextEntryCardId ?? "",
	};
}

/** 章节属性提交前校验；标题必填 */
export function validateChapterPropertyForm(
	values: ChapterPropertyFormValues,
): FormikErrors<ChapterPropertyFormValues> {
	const errors: FormikErrors<ChapterPropertyFormValues> = {};
	if (values.title.trim().length === 0) {
		errors.title = "请填写标题";
	}
	return errors;
}

/**
	* 包变更时同步 entry：若不在新包集合内则回退默认起点卡。
	* 供 UI onChange 调用；不写盘。
	*/
export function syncEntryAfterPackageChange(
	nextPackageId: string | undefined,
	currentEntryCardId: string | undefined,
	diskCtx: ChapterPackageDiskContext = EMPTY_CHAPTER_DISK_CTX,
): Pick<ChapterPropertyFormValues, "nextPackageId" | "nextEntryCardId"> {
	const packageId = (nextPackageId ?? "").trim();
	if (packageId === "") {
		return { nextPackageId: "", nextEntryCardId: "" };
	}
	return {
		nextPackageId: packageId,
		nextEntryCardId:
			resolveChapterEntryCardId(
				packageId,
				currentEntryCardId,
				diskCtx.cardIndex,
				diskCtx.entryCardIdByPackage,
			) ?? "",
	};
}

/**
	* 将表单合并回章节节点 data。
	* chapter_start 丢弃下一包字段；chapter_end 写入 Select 结果。
	*/
export function applyChapterPropertyForm(
	previous: EditorChapterNodeData,
	values: ChapterPropertyFormValues,
	diskCtx: ChapterPackageDiskContext = EMPTY_CHAPTER_DISK_CTX,
): EditorChapterNodeData {
	const title = values.title.trim();
	const summary = values.summary.trim();
	const base: EditorChapterNodeData = {
		kind: previous.kind,
		title,
		summary,
	};
	if (previous.kind !== "chapter_end") {
		return base;
	}
	const nextPackageId =
		values.nextPackageId.trim() !== ""
			? values.nextPackageId.trim()
			: undefined;
	if (!nextPackageId) {
		return base;
	}
	const resolvedEntry = resolveChapterEntryCardId(
		nextPackageId,
		values.nextEntryCardId.trim() !== ""
			? values.nextEntryCardId.trim()
			: undefined,
		diskCtx.cardIndex,
		diskCtx.entryCardIdByPackage,
	);
	return {
		...base,
		nextPackageId,
		nextEntryCardId: resolvedEntry,
	};
}
