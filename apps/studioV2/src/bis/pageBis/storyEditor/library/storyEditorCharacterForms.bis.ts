/**
	* 故事编辑器画布角色：新建 / 编辑复用 /characters FormModal。
	* 读写经 /api/characters 落盘；画布锚点同步 displayName。
	* 禁 pageComponents 直引 ajaxProxy（STRUCT-021）。
	*/
"use client";

import { useCallback, useState } from "react";
import { commitCreateCharacter } from "@studio-v2/src/bis/pageBis/characters/create/createCharacter_bis";
import type { CreateCharacterFormValues } from "@studio-v2/src/bis/pageBis/characters/create/createCharacterForm";
import {
	toCharacterDetailFormValues,
	type CharacterDetailFormValues,
} from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDetailForm";
import { characterDefToSummary } from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDefMapper";
import { commitSaveCharacterDetail } from "@studio-v2/src/bis/pageBis/characters/detail/save/saveCharacter_bis";
import {
	characterSummaryToAnchorData,
	patchAnchorDisplayName,
} from "@studio-v2/src/bis/pageBis/storyEditor/canvas/canvasCharacterAnchor";
import { fetchCharacterDef } from "@studio-v2/src/utils/ajaxProxy/library/api/charactersApi";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import type { CharacterAnchorNodeData } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

/** 角色表单所需画布口；避免 value/type 依赖 pageComponents */
export type StoryEditorCharacterCanvasApi = {
	/**
		* 在画布左侧追加角色锚点。
		* agentId 已存在时 no-op；仅会话图，不写盘。
		*/
	addCharacterAnchor: (anchor: CharacterAnchorNodeData) => void;
	/**
		* 按 agentId 更新已有锚点，并同步同角色 CallCard 的 ownerDisplayName。
		* 找不到锚点时 no-op；仅会话图。
		*/
	updateCharacterAnchor: (anchor: CharacterAnchorNodeData) => void;
};

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
	const { getCanvasApi } = args;
	const [createOpen, setCreateOpen] = useState(false);
	const [editCharacter, setEditCharacter] = useState<CharacterSummary | null>(
		null,
	);
	const [editAnchor, setEditAnchor] = useState<CharacterAnchorNodeData | null>(
		null,
	);
	const [editLoadError, setEditLoadError] = useState<string | undefined>();

	const openCreate = useCallback(function () {
		setCreateOpen(true);
	}, []);

	const closeCreate = useCallback(function () {
		setCreateOpen(false);
	}, []);

	const closeEdit = useCallback(function () {
		setEditCharacter(null);
		setEditAnchor(null);
		setEditLoadError(undefined);
	}, []);

	/**
		* 选中画布锚点后 GET /api/characters/:id；成功才打开编辑 FormModal。
		*/
	const openEditForAnchor = useCallback(
		async function (anchor: CharacterAnchorNodeData) {
			setEditLoadError(undefined);
			setEditCharacter(null);
			setEditAnchor(anchor);
			try {
				const def = await fetchCharacterDef(anchor.agentId);
				setEditCharacter(characterDefToSummary(def));
			} catch (error) {
				const detail =
					error instanceof Error && error.message.trim() !== ""
						? error.message
						: "请确认 data/characters 已有该角色";
				setEditLoadError(
					`无法加载角色「${anchor.displayName}」（${anchor.agentId}）：${detail}`,
				);
				setEditCharacter(null);
			}
		},
		[],
	);

	const onCreateSubmit = useCallback(
		async function (values: CreateCharacterFormValues): Promise<void> {
			const { summary } = await commitCreateCharacter(values);
			getCanvasApi()?.addCharacterAnchor(
				characterSummaryToAnchorData(summary),
			);
			setCreateOpen(false);
		},
		[getCanvasApi],
	);

	const onEditSubmit = useCallback(
		async function (values: CharacterDetailFormValues): Promise<void> {
			if (!editCharacter || !editAnchor) {
				throw new Error("编辑态未就绪，请重新选中角色节点");
			}
			const next = await commitSaveCharacterDetail(editCharacter, values);
			const patched = patchAnchorDisplayName(editAnchor, next);
			getCanvasApi()?.updateCharacterAnchor(patched);
			setEditCharacter(null);
			setEditAnchor(null);
			setEditLoadError(undefined);
		},
		[editAnchor, editCharacter, getCanvasApi],
	);

	return {
		createOpen,
		openCreate,
		closeCreate,
		onCreateSubmit,
		/** 已拉到 Summary 时打开编辑 FormModal */
		editOpen: editCharacter != null,
		editCharacter,
		editInitialValues: editCharacter
			? toCharacterDetailFormValues(editCharacter)
			: null,
		/** 磁盘缺失时展示；与 editOpen 互斥 */
		editLoadError,
		hasEditLoadError: editLoadError != null && editCharacter == null,
		openEditForAnchor,
		closeEdit,
		onEditSubmit,
	};
}
