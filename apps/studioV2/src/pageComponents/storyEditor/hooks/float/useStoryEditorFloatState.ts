/**
	* 编辑器壳层浮窗互斥态：属性/资源/包配置开合。
	*/
"use client";

import { useCallback, useState } from "react";
import type { StoryEditorSelection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export function useStoryEditorFloatState() {
	const [selection, setSelection] = useState<StoryEditorSelection | null>(
		null,
	);
	const [assetFloat, setAssetFloat] = useState(false);
	const [packageFloat, setPackageFloat] = useState(false);

	const onSelectionChange = useCallback(
		function (next: StoryEditorSelection | null) {
			setSelection(next);
		},
		[],
	);

	const closeSelection = useCallback(function () {
		setSelection(null);
	}, []);

	const closeAssetFloat = useCallback(function () {
		setAssetFloat(false);
	}, []);

	const closePackageFloat = useCallback(function () {
		setPackageFloat(false);
	}, []);

	return {
		selection,
		assetFloat,
		packageFloat,
		setAssetFloat,
		setPackageFloat,
		onSelectionChange,
		closeSelection,
		closeAssetFloat,
		closePackageFloat,
	};
}
