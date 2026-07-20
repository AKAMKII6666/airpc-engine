/**
 * 调试器左侧：场景设置。字段用人话；禁止手填 sessionId。
 */
"use client";

import type { FC } from "react";
import type { DebugSceneSetup } from "@studio-v2/typeFiles/debugger/debugSessionView";
import { debugSceneKindLabel } from "@studio-v2/typeFiles/debugger/debugLabels";
import styles from "../DebuggerShell.module.scss";

const SCENE_OPTIONS = [
  "user_dial",
  "agent_outbound",
  "delayed_trigger",
  "playback",
  "free_fallback",
] as const;

export type DebugScenePanelProps = {
  scene: DebugSceneSetup;
};

export const DebugScenePanel: FC<DebugScenePanelProps> = function (props) {
  const { scene } = props;
  return (
    <aside className={styles.panel} aria-label="调试场景设置">
      <h2 className={styles.panelTitle}>场景设置</h2>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>用户档案</span>
        <span className={styles.fieldValue}>{scene.userDisplayName}</span>
      </div>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>目标角色</span>
        <span className={styles.fieldValue}>{scene.characterName}</span>
      </div>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>起始 CallCard</span>
        <span className={styles.fieldValue}>{scene.startCardTitle}</span>
      </div>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>沿用当前挂卡</span>
        <span className={styles.fieldValue}>
          {scene.useCurrentPending ? "是" : "否"}
        </span>
      </div>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>重置故事状态</span>
        <span className={styles.fieldValue}>
          {scene.resetStory ? "是" : "否"}
        </span>
      </div>
      <ul className={styles.sceneList} aria-label="场景形态">
        {SCENE_OPTIONS.map((id) => (
          <li
            key={id}
            className={
              id === scene.sceneKind ? styles.sceneChipActive : styles.sceneChip
            }
          >
            {debugSceneKindLabel(id)}
          </li>
        ))}
      </ul>
    </aside>
  );
};
