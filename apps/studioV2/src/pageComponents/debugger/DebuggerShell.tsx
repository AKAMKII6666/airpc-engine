/**
 * CallCard 调试器壳：剧情推进叙事布局；mock 会话，不接 Host。
 */
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button } from "@mui/material";
import {
  MOCK_DEBUG_ADVANCED,
  MOCK_DEBUG_CALL_RUN,
  MOCK_DEBUG_EFFECTS,
  MOCK_DEBUG_EXIT_HIT,
  MOCK_DEBUG_ROLE_BOARD,
  MOCK_DEBUG_SCENE,
  MOCK_DEBUG_TIMELINE,
} from "@studio-v2/src/utils/ajaxProxy/debugger/mockDebuggerData";
import { DebugScenePanel } from "@studio-v2/src/pageComponents/debugger/com/DebugScenePanel";
import { CallRunPanel } from "@studio-v2/src/pageComponents/debugger/com/CallRunPanel";
import { RoleBoardPanel } from "@studio-v2/src/pageComponents/debugger/com/RoleBoardPanel";
import { WetEffectTimeline } from "@studio-v2/src/pageComponents/debugger/wet/WetEffectTimeline";
import styles from "./DebuggerShell.module.scss";

export const DebuggerShell: FC = function () {
  const scene = MOCK_DEBUG_SCENE;

  return (
    <main className={styles.root}>
      <header className={styles.topBar}>
        <div className={styles.topMeta}>
          <span className={styles.topTitle}>{scene.packageTitle}</span>
          <span>用户 · {scene.userDisplayName}</span>
          <span>模式 · 文本模拟</span>
        </div>
        <div className={styles.topActions}>
          <Button component={Link} href="/users" size="small" variant="outlined">
            切换用户档案
          </Button>
          <Button size="small" variant="outlined" disabled>
            重置
          </Button>
          <Button
            component={Link}
            href={`/stories/${scene.packageId}`}
            size="small"
            variant="contained"
          >
            返回编辑器
          </Button>
        </div>
      </header>

      <div className={styles.grid}>
        <DebugScenePanel scene={scene} />
        <CallRunPanel
          call={MOCK_DEBUG_CALL_RUN}
          exitHit={MOCK_DEBUG_EXIT_HIT}
          effects={MOCK_DEBUG_EFFECTS}
        />
        <RoleBoardPanel roles={MOCK_DEBUG_ROLE_BOARD} />
      </div>

      <WetEffectTimeline
        items={MOCK_DEBUG_TIMELINE}
        advanced={MOCK_DEBUG_ADVANCED}
      />
    </main>
  );
};
