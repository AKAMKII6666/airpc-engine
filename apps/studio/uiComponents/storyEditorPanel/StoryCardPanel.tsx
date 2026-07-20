/**
 * 模块名称：CallCard 结构化属性面板（JSON 对照为高级）
 */
"use client";

import type { FC } from "react";
import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { getAssets } from "@studio/utils/ajaxHelper/studio.ajax";
import type { IAssetMetaDto } from "@studio/types/frontEnd/assets/assets.types";

const TIME_BUCKETS = [
  "late_night",
  "morning",
  "afternoon",
  "evening",
  "night",
] as const;

const HARD_PATCH_KEYS = new Set(["objective", "forbidden"]);

function parseCard(json: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(json) as unknown;
    if (!v || typeof v !== "object") return null;
    return v as Record<string, unknown>;
  } catch {
    return null;
  }
}

function contextOf(card: Record<string, unknown>): Record<string, unknown> {
  const ctx = card.context;
  if (ctx && typeof ctx === "object") return ctx as Record<string, unknown>;
  return {};
}

function toolPolicyOf(card: Record<string, unknown>): {
  mode: string;
  allowedToolIds: string;
} {
  const tp = card.toolPolicy;
  if (!tp || typeof tp !== "object") {
    return { mode: "deny_all", allowedToolIds: "" };
  }
  const obj = tp as { mode?: string; allowedToolIds?: string[] };
  return {
    mode: obj.mode ?? "deny_all",
    allowedToolIds: (obj.allowedToolIds ?? []).join(", "),
  };
}

function objectivesText(card: Record<string, unknown>): string {
  const obj = card.objectives;
  if (!obj || typeof obj !== "object") return "";
  const beats = (obj as { requiredBeats?: string[] }).requiredBeats;
  return Array.isArray(beats) ? beats.join(", ") : "";
}

function promptScenesOf(
  card: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const ctx = contextOf(card);
  const layers = ctx.promptScenes;
  if (!Array.isArray(layers)) return [];
  return layers.filter(function (x): x is Record<string, unknown> {
    return typeof x === "object" && x !== null;
  });
}

function scrubHardPatchKeys(
  patch: Record<string, unknown>,
): { patch: Record<string, unknown>; stripped: string[] } {
  const next = { ...patch };
  const stripped: string[] = [];
  for (const key of HARD_PATCH_KEYS) {
    if (Object.prototype.hasOwnProperty.call(next, key)) {
      delete next[key];
      stripped.push(key);
    }
  }
  return { patch: next, stripped };
}

export interface IStoryCardPanelProps {
  selectedCardId: string;
  cardDraftJson: string;
  onChangeJson: (json: string) => void;
  onRenameCard?: (newCardId: string) => Promise<boolean>;
  renameBusy?: boolean;
}

export const StoryCardPanel: FC<IStoryCardPanelProps> = function (props) {
  const {
    selectedCardId,
    cardDraftJson,
    onChangeJson,
    onRenameCard,
    renameBusy,
  } = props;
  const card = parseCard(cardDraftJson);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState("");
  const [assets, setAssets] = useState<IAssetMetaDto[]>([]);

  useEffect(
    function (): void {
      void (async function (): Promise<void> {
        const res = await getAssets();
        if (res.ok && res.data) {
          setAssets(res.data.assets);
        }
      })();
    },
    [],
  );

  function patch(mutator: (draft: Record<string, unknown>) => void): void {
    if (!card) return;
    const next = structuredClone(card);
    mutator(next);
    onChangeJson(JSON.stringify(next, null, 2));
  }

  if (!card) {
    return (
      <Typography variant="body2" color="error" mt={1}>
        卡 JSON 无效，请先在高级对照中修好格式。
      </Typography>
    );
  }

  const ctx = contextOf(card);
  const tp = toolPolicyOf(card);
  const mode = String(card.interactionMode ?? "realtime_dialogue");
  const playbackLocked = mode === "playback_only";
  const scenes = promptScenesOf(card);
  const hardPatchWarn = scenes.some(function (layer) {
    const p = layer.patch;
    if (!p || typeof p !== "object") return false;
    return Object.keys(p as object).some(function (k) {
      return HARD_PATCH_KEYS.has(k);
    });
  });

  function updateScene(
    index: number,
    mutator: (layer: Record<string, unknown>) => void,
  ): void {
    patch(function (d): void {
      const c = contextOf(d);
      const list = Array.isArray(c.promptScenes)
        ? ([...c.promptScenes] as Record<string, unknown>[])
        : [];
      const layer = { ...(list[index] ?? {}) };
      mutator(layer);
      if (layer.patch && typeof layer.patch === "object") {
        const scrubbed = scrubHardPatchKeys(
          layer.patch as Record<string, unknown>,
        );
        layer.patch = scrubbed.patch;
      }
      list[index] = layer;
      d.context = { ...c, promptScenes: list };
    });
  }

  return (
    <Stack spacing={1.5} sx={{ mt: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip label={selectedCardId} size="small" />
        {onRenameCard ? (
          <Button
            size="small"
            disabled={renameBusy}
            onClick={function (): void {
              setRenameId(selectedCardId);
              setRenameOpen(true);
            }}
          >
            重命名 cardId
          </Button>
        ) : null}
      </Stack>
      <Dialog
        open={renameOpen}
        onClose={function (): void {
          setRenameOpen(false);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>重命名 cardId</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            将重命名 <strong>{selectedCardId}.s-card.json</strong>，并更新
            conf／layout／其它卡里的 cardId 引用。请先保存未提交的卡草稿。
          </Typography>
          <TextField
            size="small"
            fullWidth
            label="新 cardId"
            value={renameId}
            helperText="小写字母开头的 snake_case"
            onChange={function (e): void {
              setRenameId(e.target.value);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={function (): void {
              setRenameOpen(false);
            }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            disabled={
              renameBusy ||
              !renameId.trim() ||
              renameId.trim() === selectedCardId
            }
            onClick={function (): void {
              if (!onRenameCard) return;
              void (async function (): Promise<void> {
                const ok = await onRenameCard(renameId.trim());
                if (ok) setRenameOpen(false);
              })();
            }}
          >
            确认重命名
          </Button>
        </DialogActions>
      </Dialog>
      <TextField
        size="small"
        label="标题"
        value={String(card.title ?? "")}
        onChange={function (e): void {
          patch(function (d): void {
            d.title = e.target.value;
          });
        }}
      />
      <FormControl size="small" fullWidth>
        <InputLabel>cardKind</InputLabel>
        <Select
          label="cardKind"
          value={String(card.cardKind ?? "story")}
          onChange={function (e): void {
            patch(function (d): void {
              d.cardKind = e.target.value;
            });
          }}
        >
          <MenuItem value="story">story</MenuItem>
          <MenuItem value="free">free</MenuItem>
          <MenuItem value="system">system</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" fullWidth>
        <InputLabel>entryMode</InputLabel>
        <Select
          label="entryMode"
          value={String(card.entryMode ?? "inbound_user_dial")}
          onChange={function (e): void {
            patch(function (d): void {
              d.entryMode = e.target.value;
            });
          }}
        >
          <MenuItem value="inbound_user_dial">inbound_user_dial</MenuItem>
          <MenuItem value="outbound_auto">outbound_auto</MenuItem>
          <MenuItem value="either">either</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" fullWidth>
        <InputLabel>interactionMode</InputLabel>
        <Select
          label="interactionMode"
          value={mode}
          onChange={function (e): void {
            const nextMode = e.target.value;
            patch(function (d): void {
              d.interactionMode = nextMode;
              if (nextMode === "playback_only") {
                d.toolPolicy = { mode: "deny_all", allowedToolIds: [] };
              }
            });
          }}
        >
          <MenuItem value="realtime_dialogue">realtime_dialogue</MenuItem>
          <MenuItem value="playback_only">playback_only</MenuItem>
          <MenuItem value="hybrid">hybrid</MenuItem>
        </Select>
      </FormControl>
      {playbackLocked ? (
        <Alert severity="info" sx={{ py: 0 }}>
          playback_only 已锁定 toolPolicy = deny_all（保存校验亦强制）。
        </Alert>
      ) : null}
      <FormControl size="small" fullWidth>
        <InputLabel>playbackClipId</InputLabel>
        <Select
          label="playbackClipId"
          value={String(ctx.playbackClipId ?? "")}
          displayEmpty
          onChange={function (e): void {
            const nextId = String(e.target.value);
            patch(function (d): void {
              const c = contextOf(d);
              if (!nextId) {
                const { playbackClipId: _drop, ...rest } = c;
                void _drop;
                d.context = rest;
              } else {
                d.context = { ...c, playbackClipId: nextId };
              }
            });
          }}
        >
          <MenuItem value="">
            <em>未选择</em>
          </MenuItem>
          {assets.map(function (a) {
            const missing = a.fileExists === false ? "（文件缺失）" : "";
            return (
              <MenuItem key={a.assetId} value={a.assetId}>
                {a.displayName || a.assetId} · {a.kind}
                {missing}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
      <FormControl size="small" fullWidth disabled={playbackLocked}>
        <InputLabel>toolPolicy.mode</InputLabel>
        <Select
          label="toolPolicy.mode"
          value={playbackLocked ? "deny_all" : tp.mode}
          onChange={function (e): void {
            if (playbackLocked) return;
            patch(function (d): void {
              const prev =
                d.toolPolicy && typeof d.toolPolicy === "object"
                  ? (d.toolPolicy as Record<string, unknown>)
                  : {};
              d.toolPolicy = { ...prev, mode: e.target.value };
            });
          }}
        >
          <MenuItem value="inherit_free">inherit_free</MenuItem>
          <MenuItem value="allowlist">allowlist</MenuItem>
          <MenuItem value="deny_all">deny_all</MenuItem>
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="allowedToolIds（逗号分隔）"
        disabled={playbackLocked}
        value={playbackLocked ? "" : tp.allowedToolIds}
        onChange={function (e): void {
          if (playbackLocked) return;
          const ids = e.target.value
            .split(",")
            .map(function (s) {
              return s.trim();
            })
            .filter(Boolean);
          patch(function (d): void {
            const prev =
              d.toolPolicy && typeof d.toolPolicy === "object"
                ? (d.toolPolicy as Record<string, unknown>)
                : {};
            d.toolPolicy = { ...prev, allowedToolIds: ids };
          });
        }}
      />
      <Typography variant="subtitle2">context 要点</Typography>
      <TextField
        size="small"
        label="speakableBrief"
        value={String(ctx.speakableBrief ?? "")}
        onChange={function (e): void {
          patch(function (d): void {
            d.context = { ...contextOf(d), speakableBrief: e.target.value };
          });
        }}
      />
      <TextField
        size="small"
        label="privateBrief"
        value={String(ctx.privateBrief ?? "")}
        onChange={function (e): void {
          patch(function (d): void {
            d.context = { ...contextOf(d), privateBrief: e.target.value };
          });
        }}
      />
      <TextField
        size="small"
        label="objective（卡级；勿写入 promptScenes.patch）"
        value={String(ctx.objective ?? "")}
        onChange={function (e): void {
          patch(function (d): void {
            d.context = { ...contextOf(d), objective: e.target.value };
          });
        }}
      />
      <TextField
        size="small"
        label="requiredBeats（逗号分隔）"
        value={objectivesText(card)}
        onChange={function (e): void {
          const beats = e.target.value
            .split(",")
            .map(function (s) {
              return s.trim();
            })
            .filter(Boolean);
          patch(function (d): void {
            d.objectives = { requiredBeats: beats };
          });
        }}
      />

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Typography variant="subtitle2">promptScenes</Typography>
        <Button
          size="small"
          onClick={function (): void {
            patch(function (d): void {
              const c = contextOf(d);
              const list = Array.isArray(c.promptScenes)
                ? [...(c.promptScenes as unknown[])]
                : [];
              list.push({
                layerId: `layer_${list.length + 1}`,
                priority: 0,
                match: { callDirection: "either" },
                patch: { openingSpeakable: "" },
              });
              d.context = { ...c, promptScenes: list };
            });
          }}
        >
          新增层
        </Button>
      </Stack>
      {hardPatchWarn ? (
        <Alert severity="warning" sx={{ py: 0 }}>
          patch 不得含 objective／forbidden（编辑会自动剔除；校验报
          PROMPT_SCENE_PATCH_HARD）。
        </Alert>
      ) : (
        <Typography variant="caption" color="text.secondary">
          patch 只允许开场／语气等；objective／forbidden 仅卡级 context。
        </Typography>
      )}
      {scenes.map(function (layer, index) {
        const match =
          layer.match && typeof layer.match === "object"
            ? (layer.match as Record<string, unknown>)
            : {};
        const layerPatch =
          layer.patch && typeof layer.patch === "object"
            ? (layer.patch as Record<string, unknown>)
            : {};
        const buckets = Array.isArray(match.timeBuckets)
          ? (match.timeBuckets as string[]).join(", ")
          : "";
        return (
          <Accordion key={String(layer.layerId ?? index)} disableGutters>
            <AccordionSummary>
              <Typography variant="body2">
                {String(layer.layerId ?? `layer_${index + 1}`)}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                <TextField
                  size="small"
                  label="layerId"
                  value={String(layer.layerId ?? "")}
                  onChange={function (e): void {
                    updateScene(index, function (L): void {
                      L.layerId = e.target.value;
                    });
                  }}
                />
                <TextField
                  size="small"
                  type="number"
                  label="priority"
                  value={Number(layer.priority ?? 0)}
                  onChange={function (e): void {
                    updateScene(index, function (L): void {
                      L.priority = Number(e.target.value);
                    });
                  }}
                />
                <FormControl size="small" fullWidth>
                  <InputLabel>callDirection</InputLabel>
                  <Select
                    label="callDirection"
                    value={String(match.callDirection ?? "either")}
                    onChange={function (e): void {
                      updateScene(index, function (L): void {
                        L.match = {
                          ...match,
                          callDirection: e.target.value,
                        };
                      });
                    }}
                  >
                    <MenuItem value="inbound">inbound</MenuItem>
                    <MenuItem value="outbound">outbound</MenuItem>
                    <MenuItem value="either">either</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  label={`timeBuckets（${TIME_BUCKETS.join("|")}）`}
                  value={buckets}
                  onChange={function (e): void {
                    const ids = e.target.value
                      .split(",")
                      .map(function (s) {
                        return s.trim();
                      })
                      .filter(Boolean);
                    updateScene(index, function (L): void {
                      L.match = { ...match, timeBuckets: ids };
                    });
                  }}
                />
                <TextField
                  size="small"
                  label="openingSpeakable"
                  value={String(layerPatch.openingSpeakable ?? "")}
                  onChange={function (e): void {
                    updateScene(index, function (L): void {
                      L.patch = {
                        ...layerPatch,
                        openingSpeakable: e.target.value,
                      };
                    });
                  }}
                />
                <TextField
                  size="small"
                  label="openingPrivate"
                  value={String(layerPatch.openingPrivate ?? "")}
                  onChange={function (e): void {
                    updateScene(index, function (L): void {
                      L.patch = {
                        ...layerPatch,
                        openingPrivate: e.target.value,
                      };
                    });
                  }}
                />
                <TextField
                  size="small"
                  label="toneHint"
                  value={String(layerPatch.toneHint ?? "")}
                  onChange={function (e): void {
                    updateScene(index, function (L): void {
                      L.patch = { ...layerPatch, toneHint: e.target.value };
                    });
                  }}
                />
                <Button
                  size="small"
                  color="warning"
                  onClick={function (): void {
                    patch(function (d): void {
                      const c = contextOf(d);
                      const list = Array.isArray(c.promptScenes)
                        ? [...(c.promptScenes as unknown[])]
                        : [];
                      list.splice(index, 1);
                      d.context = { ...c, promptScenes: list };
                    });
                  }}
                >
                  删除此层
                </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}

      <Typography variant="caption" color="text.secondary">
        exits + effects：点画布连线编辑出口；或下方高级 JSON 对照。
      </Typography>
      <Accordion elevation={0} disableGutters>
        <AccordionSummary>
          <Typography variant="body2">高级：整卡 JSON 对照</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            multiline
            minRows={12}
            fullWidth
            size="small"
            value={cardDraftJson}
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
