/**
	* 包内章列表页命令绑定。
	*/
import type { CreateChapterFormValues } from "@studio-v2/src/bis/pageBis/packages/chapterList/chapterCreateForm";
import {
	runChapterCreate,
	runChapterDelete,
	runChapterSetEntry,
} from "../commands/chapterListCommands";

export function bindChapterListPageActions(args: {
	packageId: string;
	setBusy: (busy: boolean) => void;
	setError: (error: string | undefined) => void;
	setCreateOpen: (open: boolean) => void;
	reload: () => Promise<void>;
}) {
	const { packageId, setBusy, setError, setCreateOpen, reload } = args;
	return {
		async onCreateSubmit(values: CreateChapterFormValues): Promise<void> {
			await runChapterCreate({
				packageId,
				values,
				setBusy,
				setError,
				setCreateOpen,
				reload,
			});
		},
		async onSetEntry(chapterId: string): Promise<void> {
			await runChapterSetEntry({
				packageId,
				chapterId,
				setBusy,
				setError,
				reload,
			});
		},
		async onDelete(chapterId: string): Promise<void> {
			await runChapterDelete({
				packageId,
				chapterId,
				setBusy,
				setError,
				reload,
			});
		},
	};
}
