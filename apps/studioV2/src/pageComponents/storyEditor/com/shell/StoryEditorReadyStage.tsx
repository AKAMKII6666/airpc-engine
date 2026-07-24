/**
	* 故事编辑器就绪态主舞台：顶栏/校验条 + 画布 + 底栏 + 弹层。
	* UserGate 硬挂：未选玩家时不可操作画布。
	*/
"use client";

import type { FC } from "react";
import { useState } from "react";
import { Typography } from "@mui/material";
// 引用了StoryEditorChrome组件，用于顶栏与校验条幅
import { StoryEditorChrome } from "@studio-v2/src/pageComponents/storyEditor/com/shell/chrome/StoryEditorChrome";
// 引用了StoryEditorReadyCanvas组件，用于已选玩家后的画布舞台
import { StoryEditorReadyCanvas } from "@studio-v2/src/pageComponents/storyEditor/com/shell/StoryEditorReadyCanvas";
// 引用了UserGate组件，用于进画布硬门禁
import { UserGate } from "@studio-v2/src/commonUiComponents/userGate/UserGate";
import {
	formatStudioUserLabel,
	useStudioSessionUserBis,
} from "@studio-v2/src/bis/pageBis/users/session/studioSessionUser.bis";
import type { useStoryEditorShellController } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/useStoryEditorShellController";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { EditorGraphSeed } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import styles from "../../StoryEditorShell.module.scss";

type ShellController = ReturnType<typeof useStoryEditorShellController>;

export type StoryEditorReadyStageProps = {
	packageId: string;
	bundle: DiskStoryPackageBundle;
	graphSeed: EditorGraphSeed;
	shell: ShellController;
};

export const StoryEditorReadyStage: FC<StoryEditorReadyStageProps> = function ({
	// packageId 表示路由包键，用于画布保存与预览
	packageId,
	// bundle 表示当前会话整包，用于章节标题与画布
	bundle,
	// graphSeed 表示画布初始图，用于 RF 初始化
	graphSeed,
	// shell 表示壳控制器快照，用于保存与画布绑定
	shell,
}) {
	const { packageSession } = shell;
	const session = useStudioSessionUserBis();
	const [switchGateOpen, setSwitchGateOpen] = useState(false);

	const needsUser = !session.hasUser;
	const gateOpen = needsUser || switchGateOpen;
	const userLabel = formatStudioUserLabel(session.currentUser);

	return (
		<div className={styles.root}>
			{/* 引用了StoryEditorChrome组件，用于顶栏与校验条幅 */}
			<StoryEditorChrome
				packageTitle={shell.packageTitle}
				chapterTitle={bundle.conf.title ?? "章节"}
				saveState={packageSession.saveState}
				saveError={packageSession.saveError}
				saveValidation={packageSession.saveValidation}
				onSave={function () {
					void packageSession.onSave();
				}}
				onLocateValidationIssue={packageSession.onLocateValidationIssue}
				dismissSaveValidation={packageSession.dismissSaveValidation}
				currentUserLabel={userLabel}
				onSwitchUser={function () {
					setSwitchGateOpen(true);
				}}
			>
				{needsUser ? (
					<div className={styles.gateBlock}>
						{/* 引用了Typography组件，用于未选玩家提示 */}
						<Typography variant="body1">
							进入画布前请先选择玩家（UserGate）。
						</Typography>
					</div>
				) : (
					// 引用了StoryEditorReadyCanvas组件，用于已选玩家后的画布舞台
					<StoryEditorReadyCanvas
						packageId={packageId}
						bundle={bundle}
						graphSeed={graphSeed}
						shell={shell}
					/>
				)}
			</StoryEditorChrome>

			{/* 引用了UserGate组件，用于进画布硬门禁 / 切换玩家 */}
			<UserGate
				open={gateOpen}
				currentUserId={session.currentUser.userId}
				allowDismissWhenSelected={!needsUser}
				onClose={function () {
					setSwitchGateOpen(false);
				}}
				onSelected={function () {
					setSwitchGateOpen(false);
				}}
				title={
					needsUser ? "选择玩家后进入画布" : "切换当前玩家"
				}
			/>
		</div>
	);
};
