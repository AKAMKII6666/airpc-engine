/**
	* 玩家配置页：创建/删除 Modal 瞬时态命令。
	*/
import type { CreateUserFormValues } from "@studio-v2/src/bis/pageBis/users/create/createUserForm";

/** 从错误对象取可展示文案；空则回落默认句 */
export function userLibraryErrorMessage(
	error: unknown,
	fallback: string,
): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

export type UserLibraryModalCommands = {
	onCreateSubmit: (values: CreateUserFormValues) => Promise<{
		loreWarning?: string;
	}>;
	onConfirmDelete: (userId: string) => Promise<void>;
};

export function createUserLibraryModalHandlers(args: {
	commands: UserLibraryModalCommands;
	deleteTargetId: string | null;
	setCreateOpen: (open: boolean) => void;
	setCreateLoreWarning: (warning: string | undefined) => void;
	setDeleteTargetId: (id: string | null) => void;
	setDeleteError: (error: string | undefined) => void;
}) {
	const {
		commands,
		deleteTargetId,
		setCreateOpen,
		setCreateLoreWarning,
		setDeleteTargetId,
		setDeleteError,
	} = args;

	async function onCreateSubmit(values: CreateUserFormValues): Promise<void> {
		const result = await commands.onCreateSubmit(values);
		setCreateOpen(false);
		setCreateLoreWarning(
			result.loreWarning && result.loreWarning.trim() !== ""
				? result.loreWarning
				: undefined,
		);
	}

	function onRequestDelete(userId: string): void {
		setDeleteError(undefined);
		setDeleteTargetId(userId);
	}

	async function onConfirmDelete(): Promise<void> {
		if (deleteTargetId == null) return;
		try {
			await commands.onConfirmDelete(deleteTargetId);
			setDeleteTargetId(null);
			setDeleteError(undefined);
		} catch (error) {
			setDeleteError(userLibraryErrorMessage(error, "删除失败，请稍后重试"));
		}
	}

	function closeDeleteModal(): void {
		setDeleteTargetId(null);
		setDeleteError(undefined);
	}

	return {
		onCreateSubmit,
		onRequestDelete,
		onConfirmDelete,
		closeDeleteModal,
	};
}
