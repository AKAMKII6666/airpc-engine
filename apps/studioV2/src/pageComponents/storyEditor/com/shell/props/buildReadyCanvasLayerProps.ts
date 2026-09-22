/**
	* ReadyCanvas：把 shell 投影为 CanvasLayer props，压低父组件行数。
	*/
import type { useStoryEditorShellController } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/controller/useStoryEditorShellController";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { EditorGraphSeed } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";

type ShellController = ReturnType<typeof useStoryEditorShellController>;

export function buildReadyCanvasLayerProps(args: {
	packageId: string;
	bundle: DiskStoryPackageBundle;
	graphSeed: EditorGraphSeed;
	shell: ShellController;
}) {
	const { packageId, bundle, graphSeed, shell } = args;
	const { characterForms, assetForms, packageSession } = shell;
	return {
		packageId,
		graphSeed,
		bundle,
		selection: shell.selection,
		propertyPanelOpen: shell.propertyPanelOpen,
		assetFloat: shell.assetFloat,
		packageFloat: shell.packageFloat,
		assets: assetForms.assets,
		characterAnchors: shell.characterAnchors,
		effectPanelSources: shell.effectPanelSources,
		chapterDiskCtx: shell.chapterDiskCtx,
		chapterChapterOptions: shell.chapterChapterOptions,
		onSelectionChange: shell.onSelectionChange,
		onOpenPropertyPanel: shell.openPropertyPanel,
		onCharacterAnchorSelect: shell.onCharacterAnchorSelect,
		onCanvasReady: shell.onCanvasReady,
		onGraphMetaChange: shell.onGraphMetaChange,
		onToolModeChange: shell.onToolModeChange,
		onApplyNodeData: shell.onApplyNodeData,
		onApplyChapterNodeData: shell.onApplyChapterNodeData,
		onAssignOwner: shell.onAssignOwner,
		onRequestDeleteNode: shell.onRequestDeleteNode,
		onAddCharacter: characterForms.openCreate,
		onCloseSelection: shell.closeSelection,
		onCloseAssetFloat: shell.closeAssetFloat,
		onClosePackageFloat: shell.closePackageFloat,
		onCreateAsset: assetForms.openCreate,
		onEditAsset: assetForms.openEdit,
		onRequestDeleteAsset: assetForms.onRequestDelete,
		entryCardOptions: shell.entryCardOptions,
		onEntryCardIdChange: packageSession.onEntryCardIdChange,
		onAssetRefsChange: packageSession.onAssetRefsChange,
		onWorldFactsChange: packageSession.onWorldFactsChange,
		onPackageMetaChange: packageSession.onPackageMetaChange,
		canUseAsPlaybackClip: shell.canUseAsPlaybackClip,
		onUseAsPlaybackClip: shell.onUseAsPlaybackClip,
	};
}
