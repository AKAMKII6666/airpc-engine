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
	packageId: string;
	chapterId: string;
};

export const StoryEditorShell: FC<StoryEditorShellProps> = function ({
	packageId,
	chapterId,
}) {
	useStoryEditorShellBis(packageId, chapterId);
	const shell = useStoryEditorShellController(packageId, chapterId);
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
			chapterId={chapterId}
			bundle={bundle}
			graphSeed={graphSeed}
			shell={shell}
		/>
	);
};
