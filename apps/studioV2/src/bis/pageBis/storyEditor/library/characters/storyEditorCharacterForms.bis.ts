/**
	* 故事编辑器画布角色：新建 / 编辑复用 /characters FormModal。
	* 读写经 /api/characters 落盘；画布锚点同步 displayName。
	* 禁 pageComponents 直引 ajaxProxy（STRUCT-021）。
	*/
"use client";

import {
	characterEditInitialValues,
	useStoryEditorCharacterFormsState,
	type StoryEditorCharacterCanvasApi,
} from "./storyEditorCharacterForms.helpers";

export type { StoryEditorCharacterCanvasApi };

/**
	* 角色 FormModal bis 入参。
	* getCanvasApi 在舞台 onReady 前可为 null；提交时再取。
	*/
export type UseStoryEditorCharacterFormsBisArgs = {
	/** 画布命令口；挂载前可为 null */
	getCanvasApi: () => StoryEditorCharacterCanvasApi | null;
};

/**
	* 画布角色 FormModal：创建/编辑经 API 落盘；选中锚点按 agentId 拉磁盘投影。
	*/
export function useStoryEditorCharacterFormsBis(
	args: UseStoryEditorCharacterFormsBisArgs,
) {
	const state = useStoryEditorCharacterFormsState(args.getCanvasApi);
	return {
		createOpen: state.createOpen,
		openCreate: state.openCreate,
		closeCreate: state.closeCreate,
		onCreateSubmit: state.onCreateSubmit,
		editOpen: state.editCharacter != null,
		editCharacter: state.editCharacter,
		editInitialValues: characterEditInitialValues(state.editCharacter),
		editLoadError: state.editLoadError,
		hasEditLoadError:
			state.editLoadError != null && state.editCharacter == null,
		openEditForAnchor: state.openEditForAnchor,
		closeEdit: state.closeEdit,
		onEditSubmit: state.onEditSubmit,
	};
}
