/**
 * 模块名称：故事画布编辑器页（P6+：库/连线/conf）
 */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useStoryEditorShellBis } from "@studio/bis/shell/storyEditor.shell.bis";
import { useStoryEditorActionsBis } from "@studio/bis/storyEditor/storyEditor.bis";
import { StoryCanvas } from "@studio/uiComponents/storyCanvas/StoryCanvas";
import { StoryPalette } from "@studio/uiComponents/storyPalette/StoryPalette";
import { StoryCardPanel } from "@studio/uiComponents/storyEditorPanel/StoryCardPanel";
import { StoryExitPanel } from "@studio/uiComponents/storyEditorPanel/StoryExitPanel";
import { UserGate } from "@studio/uiComponents/userGate/UserGate";
import {
  useStudioStore,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import type { TStoryEditorPanelTab } from "@studio/types/frontEnd/store/studioStore.types";
import styles from "./storyEditor.module.scss";

export default function StoryEditorPage() {
  const params = useParams<{ packageId: string }>();
  const packageId = params.packageId;
  useStoryEditorShellBis(packageId);
  const [gateOpen, setGateOpen] = useState(false);

  const userId = useStudioStoreShallow((s) => s.layout.userId);
  const {
    title,
    selectedCardId,
    selectedEdgeId,
    panelTab,
    cardDraftJson,
    confDraftJson,
    exitDraftJson,
    validation,
    loading,
    saving,
    error,
    dirtyLayout,
    dirtyCard,
    dirtyConf,
    conf,
  } = useStudioStoreShallow(function (s) {
    return {
      title: s.storyEditor.title,
      selectedCardId: s.storyEditor.selectedCardId,
      selectedEdgeId: s.storyEditor.selectedEdgeId,
      panelTab: s.storyEditor.panelTab,
      cardDraftJson: s.storyEditor.cardDraftJson,
      confDraftJson: s.storyEditor.confDraftJson,
      exitDraftJson: s.storyEditor.exitDraftJson,
      validation: s.storyEditor.validation,
      loading: s.storyEditor.loading,
      saving: s.storyEditor.saving,
      error: s.storyEditor.error,
      dirtyLayout: s.storyEditor.dirtyLayout,
      dirtyCard: s.storyEditor.dirtyCard,
      dirtyConf: s.storyEditor.dirtyConf,
      conf: s.storyEditor.conf,
    };
  });

  const setStoryEditorCardDraft = useStudioStore(
    (s) => s.setStoryEditorCardDraft,
  );
  const setStoryEditorConfDraft = useStudioStore(
    (s) => s.setStoryEditorConfDraft,
  );
  const setStoryEditorExitDraft = useStudioStore(
    (s) => s.setStoryEditorExitDraft,
  );
  const setStoryEditorPanelTab = useStudioStore(
    (s) => s.setStoryEditorPanelTab,
  );
  const {
    validate,
    saveLayout,
    saveConf,
    saveCard,
    renameCard,
    saveExit,
    exportContent,
    exportSaveGame,
    undoCanvas,
    redoCanvas,
    canUndo,
    canRedo,
  } = useStoryEditorActionsBis();

  const errorCount = validation?.errors.length ?? 0;
  const warningCount = validation?.warnings.length ?? 0;

  useEffect(
    function (): void {
      if (!userId) setGateOpen(true);
    },
    [userId],
  );

  return (
    <section className={styles.page}>
      <UserGate
        open={!userId || gateOpen}
        onClose={function (): void {
          // 未选用户不可关；已选可关
          if (userId) setGateOpen(false);
        }}
        onSelected={function (): void {
          setGateOpen(false);
        }}
      />
      <header className={styles.header}>
        <div>
          <Typography variant="h5">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {packageId} · {conf?.cards.length ?? 0} 卡 · entry{" "}
            {conf?.entryCardId ?? "—"}
          </Typography>
        </div>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            size="small"
            variant="outlined"
            disabled={saving || !canUndo}
            onClick={function (): void {
              void undoCanvas();
            }}
          >
            撤销
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={saving || !canRedo}
            onClick={function (): void {
              void redoCanvas();
            }}
          >
            重做
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={saving}
            onClick={function (): void {
              void validate();
            }}
          >
            校验
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={!dirtyConf || saving}
            onClick={function (): void {
              void saveConf();
            }}
          >
            保存 conf
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={!dirtyLayout || saving}
            onClick={function (): void {
              void saveLayout();
            }}
          >
            保存布局
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={
              saving ||
              (panelTab === "card" && (!dirtyCard || !selectedCardId)) ||
              (panelTab === "exit" && (!dirtyCard || !selectedEdgeId)) ||
              panelTab === "conf"
            }
            onClick={function (): void {
              if (panelTab === "exit") {
                void saveExit();
              } else {
                void saveCard();
              }
            }}
          >
            {panelTab === "exit" ? "保存出口" : "保存卡片"}
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            disabled={saving || errorCount > 0}
            onClick={function (): void {
              void exportContent();
            }}
          >
            导出 Content
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={!userId || saving}
            onClick={function (): void {
              if (userId) void exportSaveGame(userId);
            }}
          >
            导出 SaveGame
          </Button>
          <Button
            size="small"
            component={Link}
            href="/debugger"
            variant="text"
          >
            去调试
          </Button>
        </Stack>
      </header>

      <Alert severity="info" className={styles.hint}>
        主路径为结构化属性与出口类型连线；真源仍是 exits[].effects。JSON
        在面板内折叠为对照。编辑不改本通 frozenCard。
        {errorCount > 0
          ? " 存在校验 error，Content 导出已阻断。"
          : null}
      </Alert>

      {loading ? (
        <Stack direction="row" alignItems="center" gap={1}>
          <CircularProgress size={20} />
          <Typography variant="body2">加载故事包…</Typography>
        </Stack>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <div className={styles.workspace}>
        <StoryPalette />
        <StoryCanvas />
        <aside className={styles.panel}>
          <Tabs
            value={panelTab}
            onChange={function (_e, value: TStoryEditorPanelTab): void {
              setStoryEditorPanelTab(value);
            }}
            variant="fullWidth"
          >
            <Tab label="包配置" value="conf" />
            <Tab label="卡片" value="card" />
            <Tab label="出口" value="exit" />
          </Tabs>

          {panelTab === "conf" ? (
            <>
              <Typography variant="caption" color="text.secondary">
                story.conf.json
              </Typography>
              <TextField
                multiline
                minRows={16}
                fullWidth
                size="small"
                value={confDraftJson}
                onChange={function (e): void {
                  setStoryEditorConfDraft(e.target.value);
                }}
                className={styles.jsonField}
              />
            </>
          ) : null}

          {panelTab === "card" ? (
            selectedCardId ? (
              <StoryCardPanel
                selectedCardId={selectedCardId}
                cardDraftJson={cardDraftJson}
                onChangeJson={setStoryEditorCardDraft}
                onRenameCard={renameCard}
                renameBusy={saving}
              />
            ) : (
              <Typography variant="body2" color="text.secondary" mt={1}>
                点击画布节点编辑卡片
              </Typography>
            )
          ) : null}

          {panelTab === "exit" ? (
            selectedEdgeId ? (
              <StoryExitPanel
                selectedEdgeId={selectedEdgeId}
                exitDraftJson={exitDraftJson}
                onChangeJson={setStoryEditorExitDraft}
              />
            ) : (
              <Typography variant="body2" color="text.secondary" mt={1}>
                从节点拖出连线并选择出口类型；或点击已有连线编辑
              </Typography>
            )
          ) : null}
        </aside>
      </div>

      <footer className={styles.footer}>
        <Typography variant="subtitle2">
          校验：{errorCount} error · {warningCount} warning
          {dirtyLayout || dirtyCard || dirtyConf
            ? " · 有未保存改动"
            : ""}
        </Typography>
        <div className={styles.issueList}>
          {validation?.errors.map(function (issue) {
            return (
              <Alert key={`e-${issue.ruleId}-${issue.path}`} severity="error">
                [{issue.ruleId}] {issue.path}: {issue.message}
              </Alert>
            );
          })}
          {validation?.warnings.map(function (issue) {
            return (
              <Alert
                key={`w-${issue.ruleId}-${issue.path}`}
                severity="warning"
              >
                [{issue.ruleId}] {issue.path}: {issue.message}
              </Alert>
            );
          })}
          {!validation?.errors.length && !validation?.warnings.length ? (
            <Typography variant="body2" color="text.secondary">
              暂无校验问题
            </Typography>
          ) : null}
        </div>
      </footer>
    </section>
  );
}
