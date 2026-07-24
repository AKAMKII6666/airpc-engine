/**
	* 故事编辑器壳层弹层聚合：角色 FormModal + 资源 FormModal/删除确认 + 节点删除确认。
	* 从 StoryEditorShell 拆出以控函数有效行数；不接 Host。
	*/
"use client";

import type { FC } from "react";
// 引用了StoryEditorCharacterModals组件，用于角色新建/编辑 FormModal
import { StoryEditorCharacterModals } from "@studio-v2/src/pageComponents/storyEditor/com/character/StoryEditorCharacterModals";
// 引用了StoryEditorAssetModals组件，用于资源新建/编辑/删除弹层
import { StoryEditorAssetModals } from "@studio-v2/src/pageComponents/storyEditor/com/asset/StoryEditorAssetModals";
// 引用了DeleteConfirmModal组件，用于通话卡删除确认
import { DeleteConfirmModal } from "@studio-v2/src/commonUiComponents/modal/confirm/DeleteConfirmModal";
import type { CreateCharacterFormValues } from "@studio-v2/src/bis/pageBis/characters/create/createCharacterForm";
import type { CharacterDetailFormValues } from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDetailForm";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import type { CreateAssetFormValues } from "@studio-v2/src/bis/pageBis/assets/createAssetForm";
import type { AssetDetailFormValues } from "@studio-v2/src/bis/pageBis/assets/assetDetailForm";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import type { PendingDeleteNode } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/useStoryEditorShellController";

/** 与 useStoryEditorCharacterFormsBis 弹层口对齐的投影 */
export type StoryEditorShellCharacterModalState = {
	createOpen: boolean;
	closeCreate: () => void;
	onCreateSubmit: (values: CreateCharacterFormValues) => Promise<void>;
	editOpen: boolean;
	editCharacter: CharacterSummary | null;
	editInitialValues: CharacterDetailFormValues | null;
	closeEdit: () => void;
	onEditSubmit: (values: CharacterDetailFormValues) => Promise<void>;
	hasEditLoadError: boolean;
	editLoadError: string | undefined;
};

/** 与 useStoryEditorAssetFormsBis 弹层口对齐的投影 */
export type StoryEditorShellAssetModalState = {
	createOpen: boolean;
	closeCreate: () => void;
	onCreateSubmit: (values: CreateAssetFormValues) => Promise<void>;
	editOpen: boolean;
	editAsset: AssetSummary | null;
	editInitialValues: AssetDetailFormValues | null;
	closeEdit: () => void;
	onEditSubmit: (values: AssetDetailFormValues) => Promise<void>;
	deleteTarget: AssetSummary | undefined;
	deleteError: string | undefined;
	closeDeleteModal: () => void;
	onConfirmDelete: () => void;
};

export type StoryEditorShellModalsProps = {
	character: StoryEditorShellCharacterModalState;
	asset: StoryEditorShellAssetModalState;
	/** 待删通话卡；null 表示确认框关闭 */
	pendingDeleteNode: PendingDeleteNode | null;
	onCloseDeleteNode: () => void;
	onConfirmDeleteNode: () => void;
};

export const StoryEditorShellModals: FC<StoryEditorShellModalsProps> = function ({
	// character 是角色弹层会话态，用于新建/编辑 FormModal
	character,
	// asset 是资源弹层会话态，用于新建/编辑/删除
	asset,
	// pendingDeleteNode 是待删通话卡，用于确认框
	pendingDeleteNode,
	// onCloseDeleteNode 关闭节点删除确认
	onCloseDeleteNode,
	// onConfirmDeleteNode 确认删除节点
	onConfirmDeleteNode,
}) {
	return (
		<>
			{/* 引用了StoryEditorCharacterModals组件，用于角色 FormModal 与拉盘错误 */}
			<StoryEditorCharacterModals
				createOpen={character.createOpen}
				onCloseCreate={character.closeCreate}
				onCreateSubmit={character.onCreateSubmit}
				editOpen={character.editOpen}
				editCharacter={character.editCharacter}
				editInitialValues={character.editInitialValues}
				onCloseEdit={character.closeEdit}
				onEditSubmit={character.onEditSubmit}
				hasEditLoadError={character.hasEditLoadError}
				editLoadError={character.editLoadError}
			/>
			{/* 引用了StoryEditorAssetModals组件，用于资源 FormModal 与删除确认 */}
			<StoryEditorAssetModals
				createOpen={asset.createOpen}
				onCloseCreate={asset.closeCreate}
				onCreateSubmit={asset.onCreateSubmit}
				editOpen={asset.editOpen}
				editAsset={asset.editAsset}
				editInitialValues={asset.editInitialValues}
				onCloseEdit={asset.closeEdit}
				onEditSubmit={asset.onEditSubmit}
				deleteTarget={asset.deleteTarget}
				deleteError={asset.deleteError}
				onCloseDelete={asset.closeDeleteModal}
				onConfirmDelete={asset.onConfirmDelete}
			/>
			{/* 引用了DeleteConfirmModal组件，用于通话卡删除确认 */}
			<DeleteConfirmModal
				open={pendingDeleteNode != null}
				title="确认删除通话卡"
				description="将从当前画布会话移除该卡及其连线；不写 data/storis-packages。"
				displayName={pendingDeleteNode?.displayName ?? ""}
				referenceLines={[]}
				error={undefined}
				onClose={onCloseDeleteNode}
				onConfirm={onConfirmDeleteNode}
			/>
		</>
	);
};
