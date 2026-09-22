/**
	* 包内章列表页：加载 meta/章摘要，新建、设入口、删章。
	*/
"use client";

import { useCallback, useEffect, useState } from "react";
import type { DiskChapterSummary } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import { bindChapterListPageActions } from "./bind/bindChapterListPageActions";
import { reloadChapterListPage } from "./bind/reloadChapterListPage";

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
		await reloadChapterListPage({
			packageId,
			setLoading,
			setError,
			setTitle,
			setEntryChapterId,
			setChapters,
		});
	}, [packageId]);

	useEffect(
		function () {
			void reload();
		},
		[reload],
	);

	const actions = bindChapterListPageActions({
		packageId,
		setBusy,
		setError,
		setCreateOpen,
		reload,
	});

	return {
		loading,
		error,
		title,
		entryChapterId,
		chapters,
		createOpen,
		setCreateOpen,
		busy,
		...actions,
	};
}
