/**
	* 包内章列表 reload。
	*/
import {
	listChaptersForPackage,
	loadPackageMeta,
} from "@studio-v2/src/bis/pageBis/packages/chapterList/chapterListSession.bis";
import type { DiskChapterSummary } from "@studio-v2/typeFiles/story/package/diskStoryPackage";

export async function reloadChapterListPage(args: {
	packageId: string;
	setLoading: (v: boolean) => void;
	setError: (v: string | undefined) => void;
	setTitle: (v: string) => void;
	setEntryChapterId: (v: string) => void;
	setChapters: (v: DiskChapterSummary[]) => void;
}): Promise<void> {
	args.setLoading(true);
	args.setError(undefined);
	try {
		const [meta, list] = await Promise.all([
			loadPackageMeta(args.packageId),
			listChaptersForPackage(args.packageId),
		]);
		args.setTitle(meta.title);
		args.setEntryChapterId(meta.entryChapterId);
		args.setChapters(list);
	} catch (err) {
		args.setError(err instanceof Error ? err.message : "加载失败");
	} finally {
		args.setLoading(false);
	}
}
