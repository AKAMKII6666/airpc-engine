/**
 * 模块名称：调试器页（控制区 + 剧情观测；工具来自 Registry∩policy）
 */
"use client";

import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useDebuggerShellBis } from "@studio/bis/shell/debugger.shell.bis";
import { useDebuggerManualCallBis } from "@studio/bis/debugger/debuggerManualCall.bis";
import { UserGate } from "@studio/uiComponents/userGate/UserGate";
import {
  useStudioStore,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import type {
  TDebuggerCallMode,
  TDebuggerDisplayLevel,
} from "@studio/types/frontEnd/store/studioStore.types";
import {
  getDebugLogs,
  getTools,
} from "@studio/utils/ajaxHelper/studio.ajax";
import styles from "./debugger.module.scss";

type ToolRow = {
  toolId: string;
  displayName: string;
  behavior: string;
  allowedInPlayback: boolean;
};

export default function DebuggerPage() {
  const [gateOpen, setGateOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsPayload, setLogsPayload] = useState<unknown>(null);
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [toolsSource, setToolsSource] = useState("registry");
  const userId = useStudioStoreShallow((s) => s.layout.userId);

  useEffect(
    function (): void {
      if (!userId) setGateOpen(true);
    },
    [userId],
  );

  useDebuggerShellBis();
  const {
    beginCall,
    invokeTool,
    endCall,
    completePlayback,
    simEvent,
    advanceClock,
    bootstrapLore,
  } = useDebuggerManualCallBis();

  const {
    callMode,
    packageId,
    cardId,
    agentId,
    sessionId,
    snapshot,
    lastEndResult,
    lastToolResult,
    lastSimEvent,
    loading,
    error,
    answeredCompleted,
    beatChecked,
    outcomeExtraFlags,
    displayLevel,
    revealPrivate,
    clockDeltaMinutes,
    localTimeOverrideEnabled,
    localNowIsoOverride,
    timeZone,
    toolId,
    toolTargetAgentId,
    memorySearchQuery,
  } = useStudioStoreShallow(function (s) {
    return {
      callMode: s.debugger.callMode,
      packageId: s.debugger.packageId,
      cardId: s.debugger.cardId,
      agentId: s.debugger.agentId,
      sessionId: s.debugger.sessionId,
      snapshot: s.debugger.snapshot,
      lastEndResult: s.debugger.lastEndResult,
      lastToolResult: s.debugger.lastToolResult,
      lastSimEvent: s.debugger.lastSimEvent,
      loading: s.debugger.loading,
      error: s.debugger.error,
      answeredCompleted: s.debugger.answeredCompleted,
      beatChecked: s.debugger.beatChecked,
      outcomeExtraFlags: s.debugger.outcomeExtraFlags,
      displayLevel: s.debugger.displayLevel,
      revealPrivate: s.debugger.revealPrivate,
      clockDeltaMinutes: s.debugger.clockDeltaMinutes,
      localTimeOverrideEnabled: s.debugger.localTimeOverrideEnabled,
      localNowIsoOverride: s.debugger.localNowIsoOverride,
      timeZone: s.debugger.timeZone,
      toolId: s.debugger.toolId,
      toolTargetAgentId: s.debugger.toolTargetAgentId,
      memorySearchQuery: s.debugger.memorySearchQuery,
    };
  });

  const setDebuggerTargets = useStudioStore((s) => s.setDebuggerTargets);
  const setDebuggerCallMode = useStudioStore((s) => s.setDebuggerCallMode);
  const setDebuggerAgentId = useStudioStore((s) => s.setDebuggerAgentId);
  const setDebuggerOutcomeFlags = useStudioStore(
    (s) => s.setDebuggerOutcomeFlags,
  );
  const setDebuggerOutcomeExtraFlags = useStudioStore(
    (s) => s.setDebuggerOutcomeExtraFlags,
  );
  const setDebuggerDisplayLevel = useStudioStore(
    (s) => s.setDebuggerDisplayLevel,
  );
  const setDebuggerClockDeltaMinutes = useStudioStore(
    (s) => s.setDebuggerClockDeltaMinutes,
  );
  const setDebuggerLocalTime = useStudioStore((s) => s.setDebuggerLocalTime);
  const setDebuggerToolFields = useStudioStore((s) => s.setDebuggerToolFields);
  const bumpDebuggerRefreshStamp = useStudioStore(
    (s) => s.bumpDebuggerRefreshStamp,
  );

  const showPrivate =
    displayLevel === "author" || revealPrivate === true;
  const active = snapshot?.activeSession ?? null;
  const rendered = active?.renderedPrompt;
  const matched =
    active?.matchedLayerIds ?? rendered?.matchedLayerIds ?? [];
  const composeScene = active?.composeScene as
    | {
        callDirection?: string;
        localTime?: { bucket?: string; isoWithOffset?: string };
        timeMentionPolicy?: string;
      }
    | undefined;
  const toolPolicy = active?.toolPolicy;
  const simObs =
    (active?.lastSimEvent as Record<string, unknown> | null | undefined) ??
    (lastSimEvent as Record<string, unknown> | null);
  const endResult = lastEndResult as {
    selectedExitId?: string;
    selectedExit?: { reason?: string; exitId?: string; source?: string };
    effectPlanResult?: { status?: string; results?: unknown[] };
    freePipeline?: {
      steps?: Array<{ id: string; status: string; detail?: string }>;
      committed?: boolean;
      skippedExit?: boolean;
    };
  } | null;
  const isFreeSession =
    active?.packageId === "__free__" ||
    active?.resolveSource === "free" ||
    active?.cardKind === "free";
  const memorySoft = rendered?.softContext?.find(function (s) {
    return s.startsWith("[memory]");
  });
  const selectedTool = tools.find(function (t) {
    return t.toolId === toolId;
  });
  const effectPlan =
    active?.effectPlanResult ??
    endResult?.effectPlanResult ??
    null;
  const composerView = rendered
    ? {
        openingSpeakable: rendered.openingSpeakable,
        openingPrivate: showPrivate
          ? rendered.openingPrivate
          : rendered.openingPrivate
            ? "[hidden:playtest]"
            : undefined,
        speakable: rendered.speakable,
        private: showPrivate
          ? rendered.private
          : rendered.private
            ? "[hidden:playtest]"
            : undefined,
        systemHard: showPrivate
          ? rendered.systemHard
          : ["[hidden:playtest]"],
      }
    : null;

  function applyPhonePreset(flags: Record<string, boolean>): void {
    setDebuggerOutcomeExtraFlags(flags);
    if ("answered_completed" in flags) {
      setDebuggerOutcomeFlags({
        answeredCompleted: Boolean(flags.answered_completed),
        beatChecked,
      });
    }
  }

  useEffect(
    function (): (() => void) | void {
      let cancelled = false;
      void (async function (): Promise<void> {
        const res = await getTools(sessionId ?? undefined);
        if (cancelled || !res.ok || !res.data) return;
        setTools(res.data.tools);
        setToolsSource(res.data.source);
        const first = res.data.tools[0]?.toolId;
        if (first) {
          setDebuggerToolFields({ toolId: first });
        }
      })();
      return function (): void {
        cancelled = true;
      };
    },
    [sessionId, setDebuggerToolFields],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h5">调试器</Typography>
      <Alert severity="info">
        Story：simulate_start → Outcome → Exit。Free：free_call（__free__）→
        MemoryCommit。SSE 仍后置（refreshStamp 拉取）；日志写入
        data/logs/engine-*.jsonl（已脱敏 private）。
      </Alert>

      <div className={styles.grid}>
        <aside className={styles.panel}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">控制区</Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={displayLevel}
              onChange={function (
                _e,
                v: TDebuggerDisplayLevel | null,
              ): void {
                if (v) setDebuggerDisplayLevel(v);
              }}
            >
              <ToggleButton value="author">author</ToggleButton>
              <ToggleButton value="playtest">playtest</ToggleButton>
            </ToggleButtonGroup>
            {displayLevel === "playtest" ? (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={revealPrivate}
                    onChange={function (_e, checked): void {
                      setDebuggerDisplayLevel("playtest", checked);
                    }}
                  />
                }
                label="临时揭示 private"
              />
            ) : null}
            <ToggleButtonGroup
              exclusive
              size="small"
              value={callMode}
              disabled={Boolean(sessionId)}
              onChange={function (
                _e,
                v: TDebuggerCallMode | null,
              ): void {
                if (v) setDebuggerCallMode(v);
              }}
            >
              <ToggleButton value="story">Story</ToggleButton>
              <ToggleButton value="free">Free</ToggleButton>
            </ToggleButtonGroup>

            {callMode === "story" ? (
              <>
                <TextField
                  size="small"
                  label="packageId"
                  value={packageId}
                  onChange={function (e): void {
                    setDebuggerTargets(e.target.value, cardId);
                  }}
                />
                <TextField
                  size="small"
                  label="cardId"
                  value={cardId}
                  onChange={function (e): void {
                    setDebuggerTargets(packageId, e.target.value);
                  }}
                />
              </>
            ) : (
              <TextField
                size="small"
                label="agentId（free_call）"
                value={agentId}
                onChange={function (e): void {
                  setDebuggerAgentId(e.target.value);
                }}
                helperText="例：doubao-sister → doubao_free"
              />
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={localTimeOverrideEnabled}
                  onChange={function (_e, checked): void {
                    setDebuggerLocalTime({ overrideEnabled: checked });
                  }}
                />
              }
              label="固定本地时间"
            />
            <TextField
              size="small"
              label="localNowIso"
              disabled={!localTimeOverrideEnabled}
              value={localNowIsoOverride}
              onChange={function (e): void {
                setDebuggerLocalTime({ localNowIso: e.target.value });
              }}
            />
            <TextField
              size="small"
              label="timeZone"
              value={timeZone}
              onChange={function (e): void {
                setDebuggerLocalTime({ timeZone: e.target.value });
              }}
            />

            {callMode === "story" ? (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={beatChecked}
                    onChange={function (_e, checked): void {
                      setDebuggerOutcomeFlags({
                        answeredCompleted,
                        beatChecked: checked,
                      });
                    }}
                  />
                }
                label="勾选 required beat"
              />
            ) : null}
            <FormControlLabel
              control={
                <Checkbox
                  checked={answeredCompleted}
                  onChange={function (_e, checked): void {
                    setDebuggerOutcomeFlags({
                      answeredCompleted: checked,
                      beatChecked,
                    });
                  }}
                />
              }
              label="answered_completed"
            />

            <Typography variant="subtitle2">电话事件预填</Typography>
            <Typography variant="caption" color="text.secondary">
              本轮覆盖：接通结束／未接／占线／提前挂断／播放完成／跳过；其余（重播／留言／回拨）分期。
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              <Button
                size="small"
                variant="outlined"
                onClick={function (): void {
                  applyPhonePreset({ answered_completed: true });
                }}
              >
                接通结束
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={function (): void {
                  applyPhonePreset({
                    answered_completed: false,
                    missed: true,
                  });
                }}
              >
                未接
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={function (): void {
                  applyPhonePreset({
                    answered_completed: false,
                    busy: true,
                  });
                }}
              >
                占线
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={function (): void {
                  applyPhonePreset({ hangup_early: true });
                }}
              >
                提前挂断
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={function (): void {
                  applyPhonePreset({ playback_completed: true });
                }}
              >
                播放完成 flag
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={function (): void {
                  applyPhonePreset({ playback_skipped: true });
                }}
              >
                播放跳过
              </Button>
            </Stack>
            {Object.keys(outcomeExtraFlags).length > 0 ? (
              <Typography variant="caption">
                extraFlags: {JSON.stringify(outcomeExtraFlags)}
              </Typography>
            ) : null}

            <Button
              variant="contained"
              disabled={!userId || loading || Boolean(sessionId)}
              onClick={function (): void {
                void beginCall();
              }}
            >
              beginCall
            </Button>
            <Button
              variant="outlined"
              disabled={
                !sessionId ||
                loading ||
                snapshot?.activeSession?.interactionPhase !== "playback"
              }
              onClick={function (): void {
                void completePlayback();
              }}
            >
              播放完成
            </Button>
            <Button
              variant="outlined"
              disabled={!sessionId || loading}
              onClick={function (): void {
                void endCall();
              }}
            >
              endCall
            </Button>

            <Typography variant="subtitle2" sx={{ pt: 1 }}>
              过程话术模拟（不计时）
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              <Button
                size="small"
                variant="outlined"
                disabled={!sessionId || loading}
                onClick={function (): void {
                  void simEvent("silence_timeout");
                }}
              >
                silence_timeout
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={!sessionId || loading}
                onClick={function (): void {
                  void simEvent("call_duration_threshold");
                }}
              >
                call_duration_threshold
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={!sessionId || loading}
                onClick={function (): void {
                  void simEvent("pre_hangup_hint");
                }}
              >
                pre_hangup_hint
              </Button>
            </Stack>
            {simObs ? (
              <Alert severity="success" sx={{ fontSize: "0.8rem" }}>
                {String(simObs.kind)} → {String(simObs.text ?? "（无文案）")}
                <br />
                {String(simObs.reason)} · {String(simObs.at ?? "")}
              </Alert>
            ) : null}

            <Typography variant="subtitle2" sx={{ pt: 1 }}>
              时钟快进（schedule）
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                type="number"
                label="分钟"
                value={clockDeltaMinutes}
                onChange={function (e): void {
                  setDebuggerClockDeltaMinutes(Number(e.target.value) || 1);
                }}
                sx={{ width: "6rem" }}
              />
              <Button
                size="small"
                variant="outlined"
                disabled={!userId || loading}
                onClick={function (): void {
                  void advanceClock();
                }}
              >
                advanceClock
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={!userId || loading}
                onClick={function (): void {
                  void bootstrapLore();
                }}
              >
                重生成 Lore
              </Button>
            </Stack>

            <Typography variant="subtitle2" sx={{ pt: 1 }}>
              工具（Registry ∩ toolPolicy）
            </Typography>
            <Typography variant="caption" color="text.secondary">
              来源：{toolsSource}
              {toolPolicy
                ? ` · policy=${toolPolicy.mode}`
                : ""}
              {active?.interactionPhase
                ? ` · phase=${active.interactionPhase}`
                : ""}
            </Typography>
            <TextField
              select
              size="small"
              label="toolId"
              value={toolId}
              disabled={!sessionId || tools.length === 0}
              onChange={function (e): void {
                setDebuggerToolFields({ toolId: e.target.value });
              }}
            >
              {tools.map(function (t) {
                return (
                  <MenuItem key={t.toolId} value={t.toolId}>
                    {t.toolId}（{t.behavior}）
                  </MenuItem>
                );
              })}
            </TextField>
            {selectedTool?.behavior === "register_exit" ? (
              <TextField
                size="small"
                label="target_agent_id"
                disabled={!sessionId}
                value={toolTargetAgentId}
                onChange={function (e): void {
                  setDebuggerToolFields({
                    toolTargetAgentId: e.target.value,
                  });
                }}
              />
            ) : null}
            {selectedTool?.behavior === "session_local" ? (
              <TextField
                size="small"
                label={
                  toolId === "get_memory_by_id"
                    ? "entry_id"
                    : "text_query"
                }
                disabled={!sessionId}
                value={memorySearchQuery}
                onChange={function (e): void {
                  setDebuggerToolFields({
                    memorySearchQuery: e.target.value,
                  });
                }}
              />
            ) : null}
            <Button
              variant="outlined"
              size="small"
              disabled={!sessionId || loading || tools.length === 0}
              onClick={function (): void {
                void invokeTool();
              }}
            >
              invokeTool
            </Button>

            <Button size="small" onClick={bumpDebuggerRefreshStamp}>
              刷新快照
            </Button>
            <Button
              size="small"
              onClick={function (): void {
                void (async function (): Promise<void> {
                  const res = await getDebugLogs({
                    userId: userId ?? undefined,
                    limit: 80,
                  });
                  if (res.ok) {
                    setLogsPayload(res.data);
                    setLogsOpen(true);
                  }
                })();
              }}
            >
              打开日志切片
            </Button>
            <Button size="small" onClick={() => setGateOpen(true)}>
              切换用户
            </Button>
            {sessionId ? (
              <Typography variant="caption">session: {sessionId}</Typography>
            ) : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </aside>

        <Stack spacing={1.5} className={styles.observe}>
          <section className={styles.panel}>
            <Typography variant="subtitle2" gutterBottom>
              当前卡 · Composer · 工具策略 · 过程话术
            </Typography>
            {active ? (
              <Stack spacing={1}>
                <Stack direction="row" gap={0.5} flexWrap="wrap">
                  <Chip
                    size="small"
                    label={isFreeSession ? "Free · __free__" : "Story"}
                    color={isFreeSession ? "secondary" : "default"}
                  />
                  <Chip
                    size="small"
                    label={`phase=${active.interactionPhase ?? "?"}`}
                  />
                  <Chip size="small" label={active.packageId} />
                  {toolPolicy ? (
                    <Chip
                      size="small"
                      color="info"
                      label={`toolPolicy=${toolPolicy.mode}`}
                    />
                  ) : null}
                </Stack>
                <Typography variant="body2">
                  {active.agentId} / {active.cardId}
                </Typography>
                {composeScene ? (
                  <Typography variant="caption" component="div">
                    ComposeScene：direction=
                    {composeScene.callDirection ?? "?"} · bucket=
                    {composeScene.localTime?.bucket ?? "?"} · policy=
                    {composeScene.timeMentionPolicy ?? "?"}
                    <br />
                    localNow={composeScene.localTime?.isoWithOffset ?? "?"}
                  </Typography>
                ) : null}
                <Typography variant="caption" color="text.secondary">
                  matchedLayerIds
                </Typography>
                <Stack direction="row" gap={0.5} flexWrap="wrap">
                  {matched.length === 0 ? (
                    <Typography variant="caption">（无）</Typography>
                  ) : (
                    matched.map(function (id) {
                      return (
                        <Chip
                          key={id}
                          size="small"
                          label={id}
                          color="primary"
                        />
                      );
                    })
                  )}
                </Stack>
                {composerView ? (
                  <pre className={styles.preCompact}>
                    {JSON.stringify(composerView, null, 2)}
                  </pre>
                ) : null}
                {memorySoft ? (
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{ whiteSpace: "pre-wrap", fontSize: "0.75rem" }}
                  >
                    {memorySoft}
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    无 memory 热投影
                  </Typography>
                )}
                {(() => {
                  const loreSoft = rendered?.softContext?.find(function (s) {
                    return s.startsWith("[lore");
                  });
                  return loreSoft ? (
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{ whiteSpace: "pre-wrap", fontSize: "0.75rem" }}
                    >
                      {loreSoft}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Lore：
                      {snapshot?.worldSummary?.lore
                        ? `source=${
                            (snapshot.worldSummary.lore as { source?: string })
                              .source ?? "?"
                          }`
                        : "null（可点「重生成 Lore」）"}
                    </Typography>
                  );
                })()}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                beginCall 后显示 Composer 快照
              </Typography>
            )}
          </section>

          <section className={styles.panel}>
            <Typography variant="subtitle2" gutterBottom>
              出口命中原因 · Free 管线 · Effect plan
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              命中：
              {JSON.stringify(
                active?.selectedExit ??
                  endResult?.selectedExit ??
                  endResult?.selectedExitId ??
                  null,
              )}
            </Typography>
            {endResult?.freePipeline?.steps ? (
              <Stack spacing={0.5} sx={{ mb: 1 }}>
                <Typography variant="caption">FreeCallPostPipeline</Typography>
                {endResult.freePipeline.steps.map(function (step) {
                  return (
                    <Chip
                      key={step.id}
                      size="small"
                      label={`${step.id}: ${step.status}${
                        step.detail ? ` · ${step.detail}` : ""
                      }`}
                      color={
                        step.status === "failed"
                          ? "error"
                          : step.status === "skipped"
                            ? "default"
                            : "success"
                      }
                      variant="outlined"
                    />
                  );
                })}
              </Stack>
            ) : isFreeSession ? (
              <Typography variant="caption" color="text.secondary">
                Free：挂机后显示 Gate → MemoryCommit → Exit → Effect 步骤
              </Typography>
            ) : null}
            <Typography variant="caption" color="text.secondary">
              effectPlan.status=
              {String(
                (effectPlan as { status?: string } | null)?.status ?? "—",
              )}
            </Typography>
            <pre className={styles.pre}>
              {JSON.stringify(
                {
                  exitCandidates: active?.exitCandidates ?? [],
                  effectPlanResult: effectPlan,
                  lastToolResult,
                },
                null,
                2,
              )}
            </pre>
          </section>

          <section className={styles.panel}>
            <Typography variant="subtitle2" gutterBottom>
              Board · Facts／knowledge · 时间线
            </Typography>
            <pre className={styles.pre}>
              {JSON.stringify(
                {
                  worldSummary: snapshot?.worldSummary ?? null,
                  board: snapshot?.board ?? null,
                  characters: snapshot?.characters ?? null,
                  telephony: snapshot?.telephony ?? null,
                  recentLogs: snapshot?.recentLogs?.slice(-8) ?? [],
                },
                null,
                2,
              )}
            </pre>
            <Accordion elevation={0} disableGutters>
              <AccordionSummary>
                <Typography variant="body2">展开 JSON 详情（全量快照）</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <pre className={styles.pre}>
                  {JSON.stringify(snapshot, null, 2)}
                </pre>
              </AccordionDetails>
            </Accordion>
          </section>
        </Stack>
      </div>

      <Dialog
        open={logsOpen}
        onClose={function (): void {
          setLogsOpen(false);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>日志切片（ring + jsonl，已脱敏）</DialogTitle>
        <DialogContent>
          <pre className={styles.pre}>{JSON.stringify(logsPayload, null, 2)}</pre>
        </DialogContent>
      </Dialog>

      <UserGate
        open={gateOpen}
        title="调试前选择用户"
        onClose={
          userId
            ? function (): void {
                setGateOpen(false);
              }
            : undefined
        }
        onSelected={function (): void {
          setGateOpen(false);
          bumpDebuggerRefreshStamp();
        }}
      />
    </Stack>
  );
}
