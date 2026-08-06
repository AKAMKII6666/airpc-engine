/**
	* 包内章列表页：加载 meta/章摘要，新建、设入口、删章。
	*/
"use client";

import { useCallback, useEffect, useState } from "react";
import {
	createChapterOnDisk,
	listChaptersForPackage,
	loadPackageMeta,
	removeChapter,
	setEntryChapter,
} from "@studio-v2/src/bis/pageBis/packages/chapterList/chapterListSession.bis";
import type { CreateChapterFormValues } from "@studio-v2/src/bis/pageBis/packages/chapterList/chapterCreateForm";
import type { DiskChapterSummary } from "@studio-v2/typeFiles/story/package/diskStoryPackage";

export type UseChapterListPageArgs = {
	packageId: string;
};

export function useChapterListPage(args: UseChapterListPageArgs) {
	const { packageId } = args;
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [title, setTitle] = useState("");
	const [entryChapterId, setEntryChapterId] = useState("");
	const [chapters, setChapters] = useState<DiskChapterSummary[]>([]);
	const [createOpen, setCreateOpen] = useState(false);
	const [busy, setBusy] = useState(false);

	const reload = useCallback(async function () {
		setLoading(true);
		setError(undefined);
		try {
			const [meta, list] = await Promise.all([
				loadPackageMeta(packageId),
				listChaptersForPackage(packageId),
			]);
			setTitle(meta.title);
			setEntryChapterId(meta.entryChapterId);
			setChapters(list);
		} catch (err) {
			setError(err instanceof Error ? err.message : "加载失败");
		} finally {
			setLoading(false);
		}
	}, [packageId]);

	useEffect(
		function () {
			void reload();
		},
		[reload],
	);

	async function onCreateSubmit(
		values: CreateChapterFormValues,
	): Promise<void> {
		const t = values.title.trim();
		if (t === "") return;
		setBusy(true);
		try {
			await createChapterOnDisk({
				packageId,
				title: t,
			});
			setCreateOpen(false);
			await reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : "新建章失败");
		} finally {
			setBusy(false);
		}
	}

	async function onSetEntry(chapterId: string): Promise<void> {
		setBusy(true);
		try {
			await setEntryChapter({ packageId, entryChapterId: chapterId });
			await reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : "设定入口章失败");
		} finally {
			setBusy(false);
		}
	}

	async function onDelete(chapterId: string): Promise<void> {
		if (!window.confirm(`确定删除章「${chapterId}」？`)) return;
		setBusy(true);
		try {
			await removeChapter({ packageId, chapterId });
			await reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : "删除章失败");
		} finally {
			setBusy(false);
		}
	}

	return {
		loading,
		error,
		title,
		entryChapterId,
		chapters,
		createOpen,
		setCreateOpen,
		busy,
		onCreateSubmit,
		onSetEntry,
		onDelete,
	};
}
