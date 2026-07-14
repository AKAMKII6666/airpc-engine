/**
 * 模块名称：Exit 结构化属性面板（condition／priority／effects；JSON 对照）
 */
"use client";

import type { FC } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

/** 与引擎 KNOWN_EFFECT_NAMES 对齐的副本（client 不直引引擎包） */
const EFFECT_NAMES = [
  "set_character_unlocked",
  "attach_call_card",
  "set_redial_slot",
  "unmount_call_card",
  "keep_card_pending",
  "schedule_call_card",
  "schedule_recurring_call",
  "create_research_commitment",
  "update_user_profile",
  "patch_memory",
  "set_world_fact",
  "update_npc_knowledge",
  "end_story",
  "create_voicemail",
  "play_system_prompt",
] as const;

const SIMPLE_OPS = [
  "always",
  "outcome_flag",
  "beat_completed",
  "beat_missing",
  "all_required_beats_completed",
] as const;

function parseExit(json: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(json) as unknown;
    if (!v || typeof v !== "object") return null;
    return v as Record<string, unknown>;
  } catch {
    return null;
  }
}

function conditionOp(cond: unknown): string {
  if (!cond || typeof cond !== "object") return "always";
  const op = (cond as { op?: string }).op;
  return typeof op === "string" ? op : "always";
}

function effectsList(exit: Record<string, unknown>): Array<Record<string, unknown>> {
  const raw = exit.effects;
  if (!Array.isArray(raw)) return [];
  return raw.filter(function (x): x is Record<string, unknown> {
    return typeof x === "object" && x !== null;
  });
}

export interface IStoryExitPanelProps {
  selectedEdgeId: string;
  exitDraftJson: string;
  onChangeJson: (json: string) => void;
}

export const StoryExitPanel: FC<IStoryExitPanelProps> = function (props) {
  const { selectedEdgeId, exitDraftJson, onChangeJson } = props;
  const exit = parseExit(exitDraftJson);

  function patch(mutator: (draft: Record<string, unknown>) => void): void {
    if (!exit) return;
    const next = structuredClone(exit);
    mutator(next);
    onChangeJson(JSON.stringify(next, null, 2));
  }

  if (!exit) {
    return (
      <Typography variant="body2" color="error" mt={1}>
        出口 JSON 无效，请在高级对照中修复。
      </Typography>
    );
  }

  const cond = exit.condition;
  const op = conditionOp(cond);
  const isComplexCond =
    op === "and" || op === "or" || op === "not" || !SIMPLE_OPS.includes(op as (typeof SIMPLE_OPS)[number]);
  const effects = effectsList(exit);

  function setSimpleCondition(nextOp: string): void {
    patch(function (d): void {
      if (nextOp === "always") {
        d.condition = { op: "always" };
        return;
      }
      if (nextOp === "all_required_beats_completed") {
        d.condition = { op: "all_required_beats_completed" };
        return;
      }
      const prev =
        d.condition && typeof d.condition === "object"
          ? (d.condition as Record<string, unknown>)
          : {};
      if (nextOp === "outcome_flag") {
        d.condition = {
          op: "outcome_flag",
          flag: typeof prev.flag === "string" ? prev.flag : "answered_completed",
          equals: typeof prev.equals === "boolean" ? prev.equals : true,
        };
        return;
      }
      d.condition = {
        op: nextOp,
        beatId: typeof prev.beatId === "string" ? prev.beatId : "",
      };
    });
  }

  function updateEffect(
    index: number,
    mutator: (ef: Record<string, unknown>) => void,
  ): void {
    patch(function (d): void {
      const list = effectsList(d).map(function (x) {
        return { ...x };
      });
      const ef = { ...(list[index] ?? { id: `ef_${index + 1}`, effect: "attach_call_card" }) };
      mutator(ef);
      list[index] = ef;
      d.effects = list;
    });
  }

  return (
    <Stack spacing={1.5} sx={{ mt: 1 }}>
      <Chip label={selectedEdgeId} size="small" />
      <TextField
        size="small"
        label="exitId"
        value={String(exit.exitId ?? "")}
        disabled
      />
      <TextField
        size="small"
        label="标题"
        value={String(exit.title ?? "")}
        onChange={function (e): void {
          patch(function (d): void {
            d.title = e.target.value;
          });
        }}
      />
      <FormControl size="small" fullWidth>
        <InputLabel>exitKind</InputLabel>
        <Select
          label="exitKind"
          value={String(exit.exitKind ?? "handoff")}
          onChange={function (e): void {
            patch(function (d): void {
              d.exitKind = e.target.value;
            });
          }}
        >
          <MenuItem value="handoff">handoff</MenuItem>
          <MenuItem value="callback">callback</MenuItem>
          <MenuItem value="recovery">recovery</MenuItem>
          <MenuItem value="failure">failure</MenuItem>
          <MenuItem value="terminal">terminal</MenuItem>
        </Select>
      </FormControl>
      <TextField
        size="small"
        type="number"
        label="priority"
        value={Number(exit.priority ?? 0)}
        onChange={function (e): void {
          patch(function (d): void {
            d.priority = Number(e.target.value);
          });
        }}
      />

      <Typography variant="subtitle2">condition</Typography>
      {isComplexCond ? (
        <Typography variant="caption" color="text.secondary">
          当前为复合条件（and／or／not），请在下方高级 JSON 编辑；或选常用 op
          覆盖为简单条件。
        </Typography>
      ) : null}
      <FormControl size="small" fullWidth>
        <InputLabel>condition.op</InputLabel>
        <Select
          label="condition.op"
          value={isComplexCond ? "always" : op}
          onChange={function (e): void {
            setSimpleCondition(e.target.value);
          }}
        >
          {SIMPLE_OPS.map(function (o) {
            return (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
      {!isComplexCond && op === "outcome_flag" ? (
        <>
          <TextField
            size="small"
            label="flag"
            value={String(
              cond && typeof cond === "object"
                ? ((cond as { flag?: string }).flag ?? "")
                : "",
            )}
            onChange={function (e): void {
              patch(function (d): void {
                d.condition = {
                  op: "outcome_flag",
                  flag: e.target.value,
                  equals:
                    d.condition &&
                    typeof d.condition === "object" &&
                    typeof (d.condition as { equals?: unknown }).equals ===
                      "boolean"
                      ? (d.condition as { equals: boolean }).equals
                      : true,
                };
              });
            }}
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={Boolean(
                  cond &&
                    typeof cond === "object" &&
                    (cond as { equals?: boolean }).equals !== false,
                )}
                onChange={function (e): void {
                  patch(function (d): void {
                    const prev =
                      d.condition && typeof d.condition === "object"
                        ? (d.condition as Record<string, unknown>)
                        : {};
                    d.condition = {
                      ...prev,
                      op: "outcome_flag",
                      equals: e.target.checked,
                    };
                  });
                }}
              />
            }
            label="equals true"
          />
        </>
      ) : null}
      {!isComplexCond &&
      (op === "beat_completed" || op === "beat_missing") ? (
        <TextField
          size="small"
          label="beatId"
          value={String(
            cond && typeof cond === "object"
              ? ((cond as { beatId?: string }).beatId ?? "")
              : "",
          )}
          onChange={function (e): void {
            patch(function (d): void {
              d.condition = { op, beatId: e.target.value };
            });
          }}
        />
      ) : null}

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Typography variant="subtitle2">effects</Typography>
        <Button
          size="small"
          onClick={function (): void {
            patch(function (d): void {
              const list = effectsList(d);
              list.push({
                id: `ef_${Date.now().toString(36)}`,
                effect: "attach_call_card",
              });
              d.effects = list;
            });
          }}
        >
          新增 effect
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        复杂 plan 只在此列表编辑，不展开为画布节点。
      </Typography>
      {effects.map(function (ef, index) {
        return (
          <Accordion key={String(ef.id ?? index)} disableGutters>
            <AccordionSummary>
              <Typography variant="body2">
                {String(ef.id ?? `ef_${index + 1}`)} ·{" "}
                {String(ef.effect ?? "?")}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                <TextField
                  size="small"
                  label="id"
                  value={String(ef.id ?? "")}
                  onChange={function (e): void {
                    updateEffect(index, function (row): void {
                      row.id = e.target.value;
                    });
                  }}
                />
                <FormControl size="small" fullWidth>
                  <InputLabel>effect</InputLabel>
                  <Select
                    label="effect"
                    value={String(ef.effect ?? "attach_call_card")}
                    onChange={function (e): void {
                      updateEffect(index, function (row): void {
                        row.effect = e.target.value;
                      });
                    }}
                  >
                    {EFFECT_NAMES.map(function (name) {
                      return (
                        <MenuItem key={name} value={name}>
                          {name}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={ef.critical === true}
                      onChange={function (e): void {
                        updateEffect(index, function (row): void {
                          if (e.target.checked) row.critical = true;
                          else delete row.critical;
                        });
                      }}
                    />
                  }
                  label="critical"
                />
                <TextField
                  size="small"
                  label="agentId（可选）"
                  value={String(ef.agentId ?? "")}
                  onChange={function (e): void {
                    updateEffect(index, function (row): void {
                      if (e.target.value) row.agentId = e.target.value;
                      else delete row.agentId;
                    });
                  }}
                />
                <TextField
                  size="small"
                  label="cardId（可选）"
                  value={String(ef.cardId ?? "")}
                  onChange={function (e): void {
                    updateEffect(index, function (row): void {
                      if (e.target.value) row.cardId = e.target.value;
                      else delete row.cardId;
                    });
                  }}
                />
                <TextField
                  size="small"
                  label="packageId（可选）"
                  value={String(ef.packageId ?? "")}
                  onChange={function (e): void {
                    updateEffect(index, function (row): void {
                      if (e.target.value) row.packageId = e.target.value;
                      else delete row.packageId;
                    });
                  }}
                />
                <Button
                  size="small"
                  color="warning"
                  onClick={function (): void {
                    patch(function (d): void {
                      const list = effectsList(d);
                      list.splice(index, 1);
                      d.effects = list;
                    });
                  }}
                >
                  删除此 effect
                </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}

      <Accordion elevation={0} disableGutters>
        <AccordionSummary>
          <Typography variant="body2">高级：整 Exit JSON 对照</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            multiline
            minRows={10}
            fullWidth
            size="small"
            value={exitDraftJson}
            onChange={function (e): void {
              onChangeJson(e.target.value);
            }}
            sx={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
            }}
          />
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
};
