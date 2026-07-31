/**
	* 章节节点属性 Formik 契约（会话 mock）。
	* chapter_end：nextChapterId / nextEntryCardId 由 Select 写入；不写盘。
	* chapter_start：仅轻量 title / summary，不含下一章配置。
	*/
import type { FormikErrors } from "formik";
import type { EditorChapterNodeData } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import { resolveChapterEntryCardId } from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/packageConfProjection";

/** chapter_end 下拉用的磁盘卡索引；由编辑器会话注入 */
export type ChapterChapterDiskContext = {
	/** 章 id → 该章内可选下一入口卡列表；只读索引，来自磁盘 bundle */
	cardIndex: Readonly<
		Record<string, readonly { cardId: string; title?: string }[]>
	>;
	/** 章 id → 默认入口卡 cardId；无配置时由 resolveChapterEntryCardId 回落 */
	entryCardIdByChapter: Readonly<Record<string, string>>;
};

/** @deprecated 使用 ChapterChapterDiskContext */
export type ChapterPackageDiskContext = ChapterChapterDiskContext;

const EMPTY_CHAPTER_DISK_CTX: ChapterChapterDiskContext = {
	cardIndex: {},
	entryCardIdByChapter: {},
};

/** 章节属性浮窗 values；空串表示未选 */
export type ChapterPropertyFormValues = {
	/** 章节节点标题；必填 */
	title: string;
	/** 轻量摘要；可空 */
	summary: string;
	/** 下一章；仅 chapter_end 提交；空串=未选 */
	nextChapterId: string;
	/** 下一章起点卡；依赖 nextChapterId；空串=未选 */
	nextEntryCardId: string;
};

/** 将章节节点投影为 Formik 初始 values */
export function toChapterPropertyFormValues(
	data: EditorChapterNodeData,
): ChapterPropertyFormValues {
	return {
		title: data.title,
		summary: data.summary,
		nextChapterId: data.nextChapterId ?? data.nextPackageId ?? "",
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
	* 章变更时同步 entry：若不在新章集合内则回退默认起点卡。
	* 供 UI onChange 调用；不写盘。
	*/
export function syncEntryAfterChapterChange(
	nextChapterId: string | undefined,
	currentEntryCardId: string | undefined,
	diskCtx: ChapterChapterDiskContext = EMPTY_CHAPTER_DISK_CTX,
): Pick<ChapterPropertyFormValues, "nextChapterId" | "nextEntryCardId"> {
	const chapterId = (nextChapterId ?? "").trim();
	if (chapterId === "") {
		return { nextChapterId: "", nextEntryCardId: "" };
	}
	return {
		nextChapterId: chapterId,
		nextEntryCardId:
			resolveChapterEntryCardId(
				chapterId,
				currentEntryCardId,
				diskCtx.cardIndex,
				diskCtx.entryCardIdByChapter,
			) ?? "",
	};
}

/** @deprecated 使用 syncEntryAfterChapterChange */
export function syncEntryAfterPackageChange(
	nextPackageId: string | undefined,
	currentEntryCardId: string | undefined,
	diskCtx: ChapterChapterDiskContext = EMPTY_CHAPTER_DISK_CTX,
): Pick<ChapterPropertyFormValues, "nextChapterId" | "nextEntryCardId"> {
	return syncEntryAfterChapterChange(
		nextPackageId,
		currentEntryCardId,
		diskCtx,
	);
}

/**
	* 将表单合并回章节节点 data。
	* chapter_start 丢弃下一章字段；chapter_end 写入 Select 结果。
	*/
export function applyChapterPropertyForm(
	previous: EditorChapterNodeData,
	values: ChapterPropertyFormValues,
	diskCtx: ChapterChapterDiskContext = EMPTY_CHAPTER_DISK_CTX,
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
	const nextChapterId =
		values.nextChapterId.trim() !== ""
			? values.nextChapterId.trim()
			: undefined;
	if (!nextChapterId) {
		return base;
	}
	const resolvedEntry = resolveChapterEntryCardId(
		nextChapterId,
		values.nextEntryCardId.trim() !== ""
			? values.nextEntryCardId.trim()
			: undefined,
		diskCtx.cardIndex,
		diskCtx.entryCardIdByChapter,
	);
	return {
		...base,
		nextChapterId,
		nextEntryCardId: resolvedEntry,
	};
}
