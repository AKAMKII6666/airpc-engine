/**
 * 首页工作台：对照 03 导向稿 + homepage-design-v1.svg。
 * 仅 mock 投影；无 Host 写口、无 ID 手填。
 */
"use client";

import { MOCK_STORY_PACKAGES } from "@studio-v2/src/utils/ajaxProxy/packages/mockWorkbenchData";
import { useStudioV2Store } from "@studio-v2/src/stores/studioV2Store";
import { WorkbenchPackagePanels } from "@studio-v2/src/pageComponents/home/com/WorkbenchPackagePanels";
import { WorkbenchSideCol } from "@studio-v2/src/pageComponents/home/WorkbenchSideCol";
import { WorkbenchTopBar } from "@studio-v2/src/pageComponents/home/WorkbenchTopBar";
import styles from "./WorkbenchShell.module.scss";

export function WorkbenchShell() {
  const workspaceTitle = useStudioV2Store((s) => s.workspaceTitle);
  const focus = MOCK_STORY_PACKAGES[0];
  const recentTail = MOCK_STORY_PACKAGES.slice(0, 4);

  return (
    <main className={styles.root}>
      <WorkbenchTopBar workspaceTitle={workspaceTitle} />
      <div className={styles.grid}>
        <div className={styles.mainCol}>
          <WorkbenchPackagePanels focus={focus} recentItems={recentTail} />
        </div>
        <WorkbenchSideCol />
      </div>
    </main>
  );
}
