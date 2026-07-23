/**
	* 编辑器壳层浮窗互斥态：属性/资源/包配置开合。
	* 单击画布只更新 selection；双击 / 定位 / 落点才打开属性浮窗。
	*/
"use client";

import { useCallback, useState } from "react";
import type { StoryEditorSelection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export function useStoryEditorFloatState() {
	const [selection, setSelection] = useState<StoryEditorSelection | null>(
		null,
	);
	const [propertyPanelOpen, setPropertyPanelOpen] = useState(false);
	const [assetFloat, setAssetFloat] = useState(false);
	const [packageFloat, setPackageFloat] = useState(false);

	/** 单击选中 / 表单写回同步；清空选中时关闭属性浮窗 */
	const onSelectionChange = useCallback(
		function (next: StoryEditorSelection | null) {
			setSelection(next);
			if (!next) {
				setPropertyPanelOpen(false);
			}
		},
		[],
	);

	/** 双击 / validate 定位 / 落点：打开属性浮窗 */
	const openPropertyPanel = useCallback(
		function (next: StoryEditorSelection | null) {
			if (!next) {
				setPropertyPanelOpen(false);
				return;
			}
			setSelection(next);
			setPropertyPanelOpen(true);
		},
		[],
	);

	/** 关闭属性浮窗，保留画布选中高亮 */
	const closeSelection = useCallback(function () {
		setPropertyPanelOpen(false);
	}, []);

	const closeAssetFloat = useCallback(function () {
		setAssetFloat(false);
	}, []);

	const closePackageFloat = useCallback(function () {
		setPackageFloat(false);
	}, []);

	return {
		selection,
		propertyPanelOpen,
		assetFloat,
		packageFloat,
		setAssetFloat,
		setPackageFloat,
		onSelectionChange,
		openPropertyPanel,
		closeSelection,
		closeAssetFloat,
		closePackageFloat,
	};
}
