/**
 * 模块名称：世界台（Profile.world + schedule）
 */
"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { useWorldShellBis } from "@studio/bis/shell/world.shell.bis";
import { useWorldEditBis } from "@studio/bis/world/worldEdit.bis";
import { useWorldWetBis } from "@studio/bis/world/wet.bis";
import { UserGate } from "@studio/uiComponents/userGate/UserGate";
import {
  useStudioStore,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import styles from "./world.module.scss";

const VISIBILITY_OPTIONS = [
  "global",
  "story",
  "agent",
  "temporary",
] as const;

export default function WorldPage() {
  const [gateOpen, setGateOpen] = useState(false);
  const [tickMinutes, setTickMinutes] = useState(60);
  const { snapshot, loading, error, userId, refresh } = useWorldShellBis();
  const edit = useWorldEditBis({ snapshot, onSaved: refresh });
  const wet = useWorldWetBis();

  const { userNickname } = useStudioStoreShallow(function (s) {
    return { userNickname: s.layout.userNickname };
  });
  const setLayoutUserId = useStudioStore((s) => s.setLayoutUserId);

  const locationLine = useMemo(
    function (): string {
      const loc = snapshot?.location;
      if (!loc) return "未设置 location（bootstrap 可能走 fallback）";
      return [loc.country, loc.province, loc.city, loc.district]
        .filter(Boolean)
        .join(" · ");
    },
    [snapshot?.location],
  );

  if (!userId) {
    return (
      <section className={styles.page}>
        <Typography component="h1" variant="h5" className={styles.title}>
          世界台
        </Typography>
        <p className={styles.lead}>
          对着当前选中用户的 Profile 查看／编辑 Lore、Facts、knowledge 与
          schedule。不另建世界库。
        </p>
        <div className={styles.gateBox}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            未选用户。请先通过 UserGate 选择或新建用户。
          </Typography>
          <Button
            variant="contained"
            onClick={function (): void {
              setGateOpen(true);
            }}
          >
            选择用户
          </Button>
        </div>
        <UserGate
          open={gateOpen}
          onClose={function (): void {
            setGateOpen(false);
          }}
          onSelected={function (id): void {
            setGateOpen(false);
            setLayoutUserId(id, null);
          }}
        />
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <Typography component="h1" variant="h5" className={styles.title}>
        世界台
      </Typography>
      <p className={styles.lead}>
        当前用户：
        <strong>
          {userNickname ?? userId}（{userId}）
        </strong>
        。写口经 Next → Host.ensureProfile／saveProfile。
      </p>
      <p className={styles.meta}>地理位置：{locationLine}</p>

      {loading ? <CircularProgress size={24} /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {edit.error ? <Alert severity="error">{edit.error}</Alert> : null}
      {edit.warning ? <Alert severity="warning">{edit.warning}</Alert> : null}
      {wet.error ? <Alert severity="error">{wet.error}</Alert> : null}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lore</h2>
        <div className={styles.row}>
          <Chip
            size="small"
            label={`source: ${edit.loreDraft.source}`}
            color={
              edit.loreDraft.source === "llm"
                ? "success"
                : edit.loreDraft.source === "fallback"
                  ? "warning"
                  : "default"
            }
            variant="outlined"
          />
          <Chip
            size="small"
            label={`generatedAt: ${edit.loreDraft.generatedAt || "—"}`}
            variant="outlined"
          />
        </div>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="sharedPremise"
          value={edit.loreDraft.sharedPremise}
          onChange={function (e): void {
            edit.setLoreDraft({
              ...edit.loreDraft,
              sharedPremise: e.target.value,
            });
          }}
          sx={{ mb: 1.5 }}
        />
        <TextField
          fullWidth
          multiline
          minRows={6}
          label="perspectives（JSON：agentId → string[]）"
          value={edit.perspectivesJson}
          onChange={function (e): void {
            edit.setPerspectivesJson(e.target.value);
          }}
          InputProps={{
            sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
          }}
        />
        <div className={styles.actions}>
          <Button
            variant="contained"
            disabled={edit.busy}
            onClick={function (): void {
              void edit.saveLore();
            }}
          >
            保存 Lore（manual）
          </Button>
          <Button
            variant="outlined"
            disabled={edit.busy}
            onClick={function (): void {
              void edit.bootstrapLore();
            }}
          >
            重生成 Lore
          </Button>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Facts</h2>
        <p className={styles.meta}>字段对齐需求 40 WorldFact；经 Zod 门面写 Profile。</p>
        {edit.facts.map(function (fact, index) {
          return (
            <div key={`${fact.factId}-${index}`} className={styles.factCard}>
              <div className={styles.row}>
                <TextField
                  size="small"
                  label="factId"
                  value={fact.factId}
                  onChange={function (e): void {
                    edit.updateFact(index, { factId: e.target.value });
                  }}
                />
                <TextField
                  size="small"
                  label="type"
                  value={fact.type}
                  onChange={function (e): void {
                    edit.updateFact(index, { type: e.target.value });
                  }}
                />
                <TextField
                  size="small"
                  select
                  label="visibility"
                  value={fact.visibility}
                  onChange={function (e): void {
                    edit.updateFact(index, {
                      visibility: e.target
                        .value as (typeof VISIBILITY_OPTIONS)[number],
                    });
                  }}
                  sx={{ minWidth: "8rem" }}
                >
                  {VISIBILITY_OPTIONS.map(function (v) {
                    return (
                      <MenuItem key={v} value={v}>
                        {v}
                      </MenuItem>
                    );
                  })}
                </TextField>
              </div>
              <TextField
                fullWidth
                size="small"
                label="value（JSON 或纯文本）"
                value={
                  typeof fact.value === "string"
                    ? fact.value
                    : JSON.stringify(fact.value)
                }
                onChange={function (e): void {
                  const raw = e.target.value;
                  try {
                    edit.updateFact(index, {
                      value: JSON.parse(raw) as IWorldFactValue,
                    });
                  } catch {
                    edit.updateFact(index, { value: raw });
                  }
                }}
                sx={{ mb: 1 }}
              />
              <Button
                size="small"
                color="error"
                onClick={function (): void {
                  edit.removeFact(index);
                }}
              >
                删除
              </Button>
            </div>
          );
        })}
        <div className={styles.actions}>
          <Button
            variant="outlined"
            disabled={edit.busy}
            onClick={function (): void {
              edit.addFact();
            }}
          >
            新增 Fact
          </Button>
          <Button
            variant="contained"
            disabled={edit.busy}
            onClick={function (): void {
              void edit.saveFacts();
            }}
          >
            保存 Facts
          </Button>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>knowledge</h2>
        <p className={styles.meta}>
          按 agentId 维护已知 factId 列表（保存为 Record&lt;agentId, factId[]&gt;）。
        </p>
        <TextField
          fullWidth
          multiline
          minRows={8}
          label="knowledge JSON"
          value={edit.knowledgeJson}
          onChange={function (e): void {
            edit.setKnowledgeJson(e.target.value);
          }}
          InputProps={{
            sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
          }}
        />
        <div className={styles.actions}>
          <Button
            variant="contained"
            disabled={edit.busy}
            onClick={function (): void {
              void edit.saveKnowledge();
            }}
          >
            保存 knowledge
          </Button>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>schedule</h2>
        <p className={styles.meta}>
          有限编辑 clockMs 与 intents。下方 Tick 为 Profile.schedule
          模拟器（非真闹钟）：once 到期挂 pending；recurring 到期生成可观测
          once 实例。
        </p>
        <TextField
          size="small"
          type="number"
          label="clockMs"
          value={edit.clockMs}
          onChange={function (e): void {
            edit.setClockMs(Number(e.target.value) || 0);
          }}
          sx={{ mb: 1.5, maxWidth: "12rem" }}
        />
        <TextField
          fullWidth
          multiline
          minRows={8}
          label="intents JSON（once / recurring）"
          value={edit.intentsJson}
          onChange={function (e): void {
            edit.setIntentsJson(e.target.value);
          }}
          InputProps={{
            sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
          }}
        />
        <div className={styles.actions}>
          <Button
            variant="contained"
            disabled={edit.busy}
            onClick={function (): void {
              void edit.saveSchedule();
            }}
          >
            保存 schedule
          </Button>
          <Button href="/debugger" variant="text">
            打开调试台
          </Button>
        </div>
        <p className={styles.meta} style={{ marginTop: "1rem" }}>
          Clock／日常 Tick
        </p>
        <div className={styles.actions}>
          <TextField
            size="small"
            type="number"
            label="快进（分钟）"
            value={tickMinutes}
            onChange={function (e): void {
              setTickMinutes(Number(e.target.value) || 1);
            }}
            sx={{ maxWidth: "8rem" }}
          />
          <Button
            size="small"
            variant="outlined"
            disabled={edit.busy}
            onClick={function (): void {
              void edit.tickAdvanceMinutes(tickMinutes);
            }}
          >
            快进
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={edit.busy}
            onClick={function (): void {
              void edit.tickJumpToClockMs(edit.clockMs);
            }}
          >
            按上方 clockMs 跳到时刻
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={edit.busy}
            onClick={function (): void {
              void edit.tickToNextIntent();
            }}
          >
            推到下一意图
          </Button>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>WET（逻辑事件）</h2>
        <p className={styles.meta}>
          {wet.storageNote ||
            "存储：Host ring + data/logs/engine-*.jsonl 旁路；不进 Profile／SaveGame。受控追加仅标注／补偿类，禁止改写历史。"}
        </p>
        <div className={styles.row}>
          <TextField
            size="small"
            label="type（支持 call.*）"
            value={wet.filterType}
            onChange={function (e): void {
              wet.setFilterType(e.target.value);
            }}
            sx={{ minWidth: "10rem" }}
          />
          <TextField
            size="small"
            label="sessionId"
            value={wet.filterSessionId}
            onChange={function (e): void {
              wet.setFilterSessionId(e.target.value);
            }}
            sx={{ minWidth: "12rem" }}
          />
          <TextField
            size="small"
            label="since（ISO）"
            value={wet.filterSince}
            onChange={function (e): void {
              wet.setFilterSince(e.target.value);
            }}
            sx={{ minWidth: "12rem" }}
          />
          <TextField
            size="small"
            label="until（ISO）"
            value={wet.filterUntil}
            onChange={function (e): void {
              wet.setFilterUntil(e.target.value);
            }}
            sx={{ minWidth: "12rem" }}
          />
        </div>
        <div className={styles.actions}>
          <Button
            variant="contained"
            disabled={wet.busy}
            onClick={function (): void {
              void wet.query();
            }}
          >
            查询事件
          </Button>
          <Button
            variant="outlined"
            disabled={wet.busy || !wet.filterSessionId.trim()}
            onClick={function (): void {
              void wet.loadReplay();
            }}
          >
            重放视图
          </Button>
        </div>
        {wet.events.length > 0 ? (
          <ul className={styles.eventList}>
            {wet.events.map(function (ev, idx) {
              return (
                <li key={`${ev.at}-${ev.type}-${idx}`} className={styles.eventItem}>
                  <code>{ev.at}</code>{" "}
                  <Chip size="small" label={ev.type} sx={{ mr: 0.5 }} />
                  {ev.sessionId ? (
                    <Button
                      size="small"
                      variant="text"
                      onClick={function (): void {
                        wet.setFilterSessionId(ev.sessionId ?? "");
                        void wet.loadReplay(ev.sessionId);
                      }}
                    >
                      {ev.sessionId.slice(0, 8)}…
                    </Button>
                  ) : null}
                  <pre className={styles.eventPayload}>
                    {JSON.stringify(ev.payload ?? null, null, 2)}
                  </pre>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.meta}>尚无查询结果。点「查询事件」加载 ring／jsonl。</p>
        )}

        <p className={styles.meta} style={{ marginTop: "1rem" }}>
          受控追加（仅 wet.annotation／wet.compensation；禁止篡改 effect 账本）
        </p>
        <div className={styles.row}>
          <TextField
            select
            size="small"
            label="追加类型"
            value={wet.appendType}
            onChange={function (e): void {
              wet.setAppendType(
                e.target.value as "wet.annotation" | "wet.compensation",
              );
            }}
            sx={{ minWidth: "12rem" }}
          >
            <MenuItem value="wet.annotation">wet.annotation</MenuItem>
            <MenuItem value="wet.compensation">wet.compensation</MenuItem>
          </TextField>
          <TextField
            size="small"
            label="关联 sessionId（可选）"
            value={wet.appendSessionId}
            onChange={function (e): void {
              wet.setAppendSessionId(e.target.value);
            }}
            sx={{ minWidth: "14rem" }}
          />
        </div>
        <TextField
          fullWidth
          multiline
          minRows={2}
          label="说明（必填）"
          value={wet.appendNote}
          onChange={function (e): void {
            wet.setAppendNote(e.target.value);
          }}
          sx={{ mt: 1 }}
        />
        <div className={styles.actions}>
          <Button
            variant="outlined"
            disabled={wet.busy || !wet.appendNote.trim()}
            onClick={function (): void {
              void wet.append();
            }}
          >
            追加标注／补偿
          </Button>
        </div>

        {wet.replay ? (
          <div className={styles.replayBox}>
            <h3 className={styles.sectionTitle}>重放视图 · {wet.replay.sessionId}</h3>
            <p className={styles.meta}>
              exit：{wet.replay.summary.exitId ?? "—"} · plan：
              {wet.replay.summary.planStatus ?? "—"} · effects：
              {wet.replay.summary.effectCount} · 标注：
              {wet.replay.summary.annotationCount} · 补偿：
              {wet.replay.summary.compensationCount}
            </p>
            {wet.replay.session?.selectedExit ? (
              <pre className={styles.eventPayload}>
                {JSON.stringify(
                  {
                    selectedExit: wet.replay.session.selectedExit,
                    effectPlanResult: wet.replay.session.effectPlanResult,
                    effectLedgerKeys: wet.replay.session.effectLedgerKeys,
                  },
                  null,
                  2,
                )}
              </pre>
            ) : (
              <p className={styles.meta}>
                Session 已不在 Host 内存；摘要来自事件 payload（若有 call.completed）。
              </p>
            )}
            <pre className={styles.eventPayload}>
              {JSON.stringify(wet.replay.events, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </section>
  );
}

type IWorldFactValue =
  | boolean
  | string
  | number
  | Record<string, unknown>
  | unknown[];
