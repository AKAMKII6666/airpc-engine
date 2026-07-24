/**
	* 故事编辑器全屏壳：挂 shell bis 灌账 → 加载 / 失败 / 就绪舞台。
	*/
"use client";

import type { FC } from "react";
import { useStoryEditorShellBis } from "@studio-v2/src/bis/shellBis/storyEditor/storyEditor.shell.bis";
import {
	StoryEditorLoadErrorView,
	StoryEditorLoadingView,
} from "@studio-v2/src/pageComponents/storyEditor/com/shell/chrome/StoryEditorChrome";
import { StoryEditorReadyStage } from "@studio-v2/src/pageComponents/storyEditor/com/shell/StoryEditorReadyStage";
import { useStoryEditorShellController } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/useStoryEditorShellController";

export type StoryEditorShellProps = {
	/** 路由包键；打开与保存均针对 data/storis-packages 下该目录 */
	packageId: string;
};

export const StoryEditorShell: FC<StoryEditorShellProps> = function ({
	// packageId 是路由包键，用于磁盘整包读写
	packageId,
}) {
	// 页级唯一 shell：打开包灌 stores/storyEditor；听 refreshStamp
	useStoryEditorShellBis(packageId);
	const shell = useStoryEditorShellController(packageId);
	const { loading, loadError, graphSeed, bundle } = shell.packageSession;

	if (loading) {
		return (
			// 引用了StoryEditorLoadingView组件，用于磁盘加载中
			<StoryEditorLoadingView />
		);
	}

	if (loadError || !graphSeed || !bundle) {
		return (
			// 引用了StoryEditorLoadErrorView组件，用于打开失败
			<StoryEditorLoadErrorView
				message={loadError ?? "无法加载故事包"}
			/>
		);
	}

	return (
		// 引用了StoryEditorReadyStage组件，用于就绪态主舞台
		<StoryEditorReadyStage
			packageId={packageId}
			bundle={bundle}
			graphSeed={graphSeed}
			shell={shell}
		/>
	);
};
