/**
 * 首页焦点卡与最近故事包列表。
 */
"use client";

import type { FC } from "react";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import { FocusPackageCard } from "@studio-v2/src/pageComponents/home/com/FocusPackageCard";
import { RecentPackageRows } from "@studio-v2/src/pageComponents/home/com/RecentPackageRows";
import styles from "../WorkbenchShell.module.scss";

type Props = {
  focus: StoryPackageSummary | undefined;
  recentItems: readonly StoryPackageSummary[];
};

export const WorkbenchPackagePanels: FC<Props> = function (props) {
  const { focus, recentItems } = props;
  return (
    <>
      <div>
        <h1 className={styles.heroTitle}>故事工程工作台</h1>
        <p className={styles.heroSub}>
          继续编辑故事包、创建新章节、导入 CallCard 包，并检查当前工程状态。
        </p>
      </div>
      {focus ? <FocusPackageCard pkg={focus} /> : null}
      <RecentPackageRows items={recentItems} />
    </>
  );
};
