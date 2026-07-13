/**
 * 模块名称：调试器页（Manual Story 挂机）
 */
"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useDebuggerShellBis } from "@studio/bis/shell/debugger.shell.bis";
import { useDebuggerManualCallBis } from "@studio/bis/debugger/debuggerManualCall.bis";
import { UserGate } from "@studio/uiComponents/userGate/UserGate";
import {
  useStudioStore,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import styles from "./debugger.module.scss";

export default function DebuggerPage() {
  const [gateOpen, setGateOpen] = useState(false);
  const userId = useStudioStoreShallow((s) => s.layout.userId);

  useEffect(
    function (): void {
      if (!userId) setGateOpen(true);
    },
    [userId],
  );

  useDebuggerShellBis();
  const { beginCall, endCall } = useDebuggerManualCallBis();

  const {
    packageId,
    cardId,
    sessionId,
    snapshot,
    lastEndResult,
    loading,
    error,
    answeredCompleted,
    beatChecked,
  } = useStudioStoreShallow(function (s) {
    return {
      packageId: s.debugger.packageId,
      cardId: s.debugger.cardId,
      sessionId: s.debugger.sessionId,
      snapshot: s.debugger.snapshot,
      lastEndResult: s.debugger.lastEndResult,
      loading: s.debugger.loading,
      error: s.debugger.error,
      answeredCompleted: s.debugger.answeredCompleted,
      beatChecked: s.debugger.beatChecked,
    };
  });

  const setDebuggerTargets = useStudioStore((s) => s.setDebuggerTargets);
  const setDebuggerOutcomeFlags = useStudioStore(
    (s) => s.setDebuggerOutcomeFlags,
  );
  const bumpDebuggerRefreshStamp = useStudioStore(
    (s) => s.bumpDebuggerRefreshStamp,
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h5">调试器</Typography>
      <Alert severity="info">
        Manual 通道：simulate_start → Outcome → Exit → Effect。不改卡（编辑请回故事画布）。
      </Alert>

      <div className={styles.grid}>
        <aside className={styles.panel}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">模拟控制</Typography>
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
              disabled={!sessionId || loading}
              onClick={function (): void {
                void endCall();
              }}
            >
              endCall（Manual Outcome）
            </Button>
            <Button
              size="small"
              onClick={function (): void {
                bumpDebuggerRefreshStamp();
              }}
            >
              刷新快照
            </Button>
            <Button
              size="small"
              onClick={function (): void {
                setGateOpen(true);
              }}
            >
              切换用户
            </Button>
            {sessionId ? (
              <Typography variant="caption">session: {sessionId}</Typography>
            ) : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </aside>

        <section className={styles.panel}>
          <Typography variant="subtitle2" gutterBottom>
            Board / Session / Effects
          </Typography>
          <pre className={styles.pre}>
            {JSON.stringify(
              {
                activeSession: snapshot?.activeSession ?? null,
                board: snapshot?.board ?? null,
                telephony: snapshot?.telephony ?? null,
                characters: snapshot?.characters ?? null,
                lastEndResult,
                recentLogs: snapshot?.recentLogs ?? [],
              },
              null,
              2,
            )}
          </pre>
        </section>
      </div>

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
