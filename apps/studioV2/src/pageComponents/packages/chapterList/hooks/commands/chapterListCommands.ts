/**
	* 包内章列表：新建 / 设入口 / 删除命令。
	*/
import {
	createChapterOnDisk,
	removeChapter,
	setEntryChapter,
} from "@studio-v2/src/bis/pageBis/packages/chapterList/chapterListSession.bis";
import type { CreateChapterFormValues } from "@studio-v2/src/bis/pageBis/packages/chapterList/chapterCreateForm";

export async function runChapterCreate(args: {
	packageId: string;
	values: CreateChapterFormValues;
	setBusy: (busy: boolean) => void;
	setError: (error: string | undefined) => void;
	setCreateOpen: (open: boolean) => void;
	reload: () => Promise<void>;
}): Promise<void> {
	const t = args.values.title.trim();
	if (t === "") return;
	args.setBusy(true);
	try {
		await createChapterOnDisk({ packageId: args.packageId, title: t });
		args.setCreateOpen(false);
		await args.reload();
	} catch (err) {
		args.setError(err instanceof Error ? err.message : "新建章失败");
	} finally {
		args.setBusy(false);
	}
}

export async function runChapterSetEntry(args: {
	packageId: string;
	chapterId: string;
	setBusy: (busy: boolean) => void;
	setError: (error: string | undefined) => void;
	reload: () => Promise<void>;
}): Promise<void> {
	args.setBusy(true);
	try {
		await setEntryChapter({
			packageId: args.packageId,
			entryChapterId: args.chapterId,
		});
		await args.reload();
	} catch (err) {
		args.setError(err instanceof Error ? err.message : "设定入口章失败");
	} finally {
		args.setBusy(false);
	}
}

export async function runChapterDelete(args: {
	packageId: string;
	chapterId: string;
	setBusy: (busy: boolean) => void;
	setError: (error: string | undefined) => void;
	reload: () => Promise<void>;
}): Promise<void> {
	if (!window.confirm(`确定删除章「${args.chapterId}」？`)) return;
	args.setBusy(true);
	try {
		await removeChapter({
			packageId: args.packageId,
			chapterId: args.chapterId,
		});
		await args.reload();
	} catch (err) {
		args.setError(err instanceof Error ? err.message : "删除章失败");
	} finally {
		args.setBusy(false);
	}
}
