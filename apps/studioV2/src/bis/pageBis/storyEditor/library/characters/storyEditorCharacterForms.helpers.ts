/**
	* 故事编辑器画布角色表单：弹层态与命令（抽出以降函数行数）。
	*/
"use client";

import { useCallback, useState } from "react";
import { commitCreateCharacter } from "@studio-v2/src/bis/pageBis/characters/create/createCharacter_bis";
import type { CreateCharacterFormValues } from "@studio-v2/src/bis/pageBis/characters/create/createCharacterForm";
import {
	toCharacterDetailFormValues,
	type CharacterDetailFormValues,
} from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDetailForm";
import { characterDefToSummary } from "@studio-v2/src/bis/pageBis/characters/detail/form/mapper/characterDefMapper";
import { commitSaveCharacterDetail } from "@studio-v2/src/bis/pageBis/characters/detail/save/saveCharacter_bis";
import {
	characterSummaryToAnchorData,
	patchAnchorDisplayName,
} from "@studio-v2/src/bis/pageBis/storyEditor/canvas/canvasCharacterAnchor";
import { fetchCharacterDef } from "@studio-v2/src/utils/ajaxProxy/library/api/characters/charactersApi";
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

/** StoryEditorCharacterFormsState：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type StoryEditorCharacterFormsState = {
	/** StoryEditorCharacterFormsState.createOpen：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	createOpen: boolean;
	/** StoryEditorCharacterFormsState.editCharacter：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	editCharacter: CharacterSummary | null;
	/** StoryEditorCharacterFormsState.editAnchor：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	editAnchor: CharacterAnchorNodeData | null;
	/** StoryEditorCharacterFormsState.editLoadError：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	editLoadError: string | undefined;
	/** StoryEditorCharacterFormsState.openCreate：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	openCreate: () => void;
	/** StoryEditorCharacterFormsState.closeCreate：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	closeCreate: () => void;
	/** StoryEditorCharacterFormsState.closeEdit：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	closeEdit: () => void;
	/** StoryEditorCharacterFormsState.openEditForAnchor：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	openEditForAnchor: (anchor: CharacterAnchorNodeData) => Promise<void>;
	/** StoryEditorCharacterFormsState.onCreateSubmit：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	onCreateSubmit: (values: CreateCharacterFormValues) => Promise<void>;
	/** StoryEditorCharacterFormsState.onEditSubmit：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	onEditSubmit: (values: CharacterDetailFormValues) => Promise<void>;
};

/** 打开编辑 / 新建 / 保存命令；从主 hook 拆出以压函数行数。 */
function useStoryEditorCharacterFormCommands(input: {
	getCanvasApi: () => StoryEditorCharacterCanvasApi | null;
	editCharacter: CharacterSummary | null;
	editAnchor: CharacterAnchorNodeData | null;
	setCreateOpen: (open: boolean) => void;
	setEditCharacter: (character: CharacterSummary | null) => void;
	setEditAnchor: (anchor: CharacterAnchorNodeData | null) => void;
	setEditLoadError: (message: string | undefined) => void;
}) {
	const openEditForAnchor = useCallback(
		async function (anchor: CharacterAnchorNodeData) {
			input.setEditLoadError(undefined);
			input.setEditCharacter(null);
			input.setEditAnchor(anchor);
			try {
				const def = await fetchCharacterDef(anchor.agentId);
				input.setEditCharacter(characterDefToSummary(def));
			} catch (error) {
				const detail =
					error instanceof Error && error.message.trim() !== ""
						? error.message
						: "请确认 data/characters 已有该角色";
				input.setEditLoadError(
					`无法加载角色「${anchor.displayName}」（${anchor.agentId}）：${detail}`,
				);
				input.setEditCharacter(null);
			}
		},
		[input],
	);

	const onCreateSubmit = useCallback(
		async function (values: CreateCharacterFormValues): Promise<void> {
			const { summary } = await commitCreateCharacter(values);
			input.getCanvasApi()?.addCharacterAnchor(
				characterSummaryToAnchorData(summary),
			);
			input.setCreateOpen(false);
		},
		[input],
	);

	const onEditSubmit = useCallback(
		async function (values: CharacterDetailFormValues): Promise<void> {
			if (!input.editCharacter || !input.editAnchor) {
				throw new Error("编辑态未就绪，请重新选中角色节点");
			}
			const next = await commitSaveCharacterDetail(input.editCharacter, values);
			const patched = patchAnchorDisplayName(input.editAnchor, next);
			input.getCanvasApi()?.updateCharacterAnchor(patched);
			input.setEditCharacter(null);
			input.setEditAnchor(null);
			input.setEditLoadError(undefined);
		},
		[input],
	);

	return { openEditForAnchor, onCreateSubmit, onEditSubmit };
}

/** useStoryEditorCharacterFormsState：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function useStoryEditorCharacterFormsState(
	getCanvasApi: () => StoryEditorCharacterCanvasApi | null,
): StoryEditorCharacterFormsState {
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

	const commands = useStoryEditorCharacterFormCommands({
		getCanvasApi,
		editCharacter,
		editAnchor,
		setCreateOpen,
		setEditCharacter,
		setEditAnchor,
		setEditLoadError,
	});

	return {
		createOpen,
		editCharacter,
		editAnchor,
		editLoadError,
		openCreate,
		closeCreate,
		closeEdit,
		openEditForAnchor: commands.openEditForAnchor,
		onCreateSubmit: commands.onCreateSubmit,
		onEditSubmit: commands.onEditSubmit,
	};
}

/** characterEditInitialValues：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function characterEditInitialValues(
	editCharacter: CharacterSummary | null,
): ReturnType<typeof toCharacterDetailFormValues> | null {
	return editCharacter ? toCharacterDetailFormValues(editCharacter) : null;
}
