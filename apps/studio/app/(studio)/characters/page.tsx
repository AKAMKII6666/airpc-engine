/**
 * 模块名称：角色台（可写 CharacterDef + FreeCallCard）
 */
"use client";

import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useCharactersShellBis } from "@studio/bis/shell/characters.shell.bis";
import { useCharactersEditBis } from "@studio/bis/characters/charactersEdit.bis";
import styles from "./characters.module.scss";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function jsonFieldValue(value: unknown): string {
  return JSON.stringify(value ?? (Array.isArray(value) ? [] : {}), null, 2);
}

export default function CharactersPage() {
  const { characters, loading, error, refresh } = useCharactersShellBis();
  const edit = useCharactersEditBis();

  const persona = asRecord(edit.character?.persona);
  const identity = asRecord(edit.character?.identity);
  const callFlowPrompts = asRecord(edit.character?.callFlowPrompts);
  const callFlowPolicy = asRecord(edit.character?.callFlowPolicy);
  const narrativeOnly = Boolean(edit.character?.isNarrativeOnly);

  return (
    <section className={styles.page}>
      <Typography component="h1" variant="h5" className={styles.title}>
        角色台
      </Typography>
      <p className={styles.lead}>
        维护 identity／persona／defaultPromptScenes／callFlow／social／dialable／Free；保存经
        Next 门面写入 Content，引擎热重载保留 Session（S1）。
      </p>
      {loading ? <CircularProgress size={24} /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {edit.error ? <Alert severity="error">{edit.error}</Alert> : null}
      {edit.warning ? <Alert severity="warning">{edit.warning}</Alert> : null}

      <div className={styles.createBar}>
        <TextField
          size="small"
          label="新角色 agentId"
          value={edit.createAgentId}
          onChange={function (e): void {
            edit.setCreateAgentId(e.target.value);
          }}
        />
        <TextField
          size="small"
          label="displayName"
          value={edit.createDisplayName}
          onChange={function (e): void {
            edit.setCreateDisplayName(e.target.value);
          }}
        />
        <Button
          variant="outlined"
          disabled={edit.busy}
          onClick={function (): void {
            void (async function (): Promise<void> {
              const ok = await edit.createCharacter();
              if (ok) await refresh();
            })();
          }}
        >
          创建角色（含 Free）
        </Button>
      </div>

      <div className={styles.list}>
        {characters.map(function (ch) {
          const selected = edit.character?.agentId === ch.agentId;
          return (
            <button
              key={ch.agentId}
              type="button"
              className={[styles.card, selected ? styles.cardSelected : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={function (): void {
                void edit.loadCharacter(ch.agentId);
              }}
            >
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>{ch.displayName}</h2>
                <Stack direction="row" spacing={0.5}>
                  {ch.isNarrativeOnly ? (
                    <Chip size="small" label="叙事" variant="outlined" />
                  ) : null}
                  <Chip
                    size="small"
                    label={ch.dialable ? "可拨" : "不可拨"}
                    color={ch.dialable ? "success" : "default"}
                    variant="outlined"
                  />
                </Stack>
              </div>
              <p className={styles.meta}>
                agentId: {ch.agentId}
                {ch.freeCardId ? ` · freeCardId: ${ch.freeCardId}` : ""}
              </p>
            </button>
          );
        })}
      </div>

      {edit.character ? (
        <div className={styles.editor}>
          <Typography variant="h6">
            编辑 {String(edit.character.displayName ?? edit.character.agentId)}
          </Typography>
          {narrativeOnly ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              narrative-only：不可拨号；保存时将清除 dialable 与 freeCardId（无
              Free 卡）。
            </Alert>
          ) : null}
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              size="small"
              label="displayName"
              value={String(edit.character.displayName ?? "")}
              onChange={function (e): void {
                edit.setCharacter({
                  ...edit.character!,
                  displayName: e.target.value,
                });
              }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={narrativeOnly}
                  onChange={function (_e, checked): void {
                    edit.setCharacter({
                      ...edit.character!,
                      isNarrativeOnly: checked,
                      ...(checked
                        ? { dialable: false, freeCardId: undefined }
                        : {}),
                    });
                  }}
                />
              }
              label="isNarrativeOnly（叙事专用）"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(edit.character.dialable)}
                  disabled={narrativeOnly}
                  onChange={function (_e, checked): void {
                    edit.setCharacter({
                      ...edit.character!,
                      dialable: checked,
                    });
                  }}
                />
              }
              label="dialable"
            />
            <TextField
              size="small"
              label="freeCardId"
              disabled={narrativeOnly}
              value={String(edit.character.freeCardId ?? "")}
              onChange={function (e): void {
                edit.setCharacter({
                  ...edit.character!,
                  freeCardId: e.target.value || undefined,
                });
              }}
              helperText="对应 characters/free-cards/{id}.s-card.json"
            />

            <Typography variant="subtitle2">identity</Typography>
            <TextField
              size="small"
              label="identity.gender"
              value={String(identity.gender ?? "")}
              onChange={function (e): void {
                edit.setCharacter({
                  ...edit.character!,
                  identity: { ...identity, gender: e.target.value },
                });
              }}
            />
            <TextField
              size="small"
              label="identity.ageNote"
              value={String(identity.ageNote ?? "")}
              onChange={function (e): void {
                edit.setCharacter({
                  ...edit.character!,
                  identity: { ...identity, ageNote: e.target.value },
                });
              }}
            />
            <TextField
              size="small"
              label="identity.birthday"
              value={String(identity.birthday ?? "")}
              onChange={function (e): void {
                edit.setCharacter({
                  ...edit.character!,
                  identity: { ...identity, birthday: e.target.value },
                });
              }}
            />

            <Typography variant="subtitle2">persona</Typography>
            <TextField
              size="small"
              label="persona.systemPrompt"
              multiline
              minRows={3}
              value={String(persona.systemPrompt ?? "")}
              onChange={function (e): void {
                edit.setCharacter({
                  ...edit.character!,
                  persona: { ...persona, systemPrompt: e.target.value },
                });
              }}
            />
            <TextField
              size="small"
              label="persona.speakingStyle"
              value={String(persona.speakingStyle ?? "")}
              onChange={function (e): void {
                edit.setCharacter({
                  ...edit.character!,
                  persona: { ...persona, speakingStyle: e.target.value },
                });
              }}
            />
            <TextField
              size="small"
              label="persona.profession"
              value={String(persona.profession ?? "")}
              onChange={function (e): void {
                edit.setCharacter({
                  ...edit.character!,
                  persona: { ...persona, profession: e.target.value },
                });
              }}
            />
            <TextField
              size="small"
              label="persona.voiceId"
              value={String(persona.voiceId ?? "")}
              onChange={function (e): void {
                edit.setCharacter({
                  ...edit.character!,
                  persona: { ...persona, voiceId: e.target.value },
                });
              }}
            />
            <TextField
              size="small"
              label="persona.exampleLines（JSON 字符串数组）"
              multiline
              minRows={2}
              value={jsonFieldValue(persona.exampleLines ?? [])}
              onChange={function (e): void {
                try {
                  const exampleLines = JSON.parse(e.target.value) as unknown;
                  if (Array.isArray(exampleLines)) {
                    edit.setCharacter({
                      ...edit.character!,
                      persona: { ...persona, exampleLines },
                    });
                  }
                } catch {
                  // typing
                }
              }}
            />

            <TextField
              size="small"
              label="defaultPromptScenes（JSON）"
              multiline
              minRows={6}
              value={jsonFieldValue(edit.character.defaultPromptScenes ?? [])}
              onChange={function (e): void {
                try {
                  const defaultPromptScenes = JSON.parse(
                    e.target.value,
                  ) as unknown;
                  if (Array.isArray(defaultPromptScenes)) {
                    edit.setCharacter({
                      ...edit.character!,
                      defaultPromptScenes,
                    });
                  }
                } catch {
                  // typing
                }
              }}
            />
            <TextField
              size="small"
              label="social（JSON 数组）"
              multiline
              minRows={4}
              value={jsonFieldValue(edit.character.social ?? [])}
              onChange={function (e): void {
                try {
                  const social = JSON.parse(e.target.value) as unknown;
                  if (Array.isArray(social)) {
                    edit.setCharacter({ ...edit.character!, social });
                  }
                } catch {
                  // typing
                }
              }}
            />
            <TextField
              size="small"
              label="callFlowPrompts（JSON）"
              multiline
              minRows={5}
              value={jsonFieldValue(callFlowPrompts)}
              onChange={function (e): void {
                try {
                  const next = JSON.parse(e.target.value) as unknown;
                  if (next && typeof next === "object") {
                    edit.setCharacter({
                      ...edit.character!,
                      callFlowPrompts: next,
                    });
                  }
                } catch {
                  // typing
                }
              }}
            />
            <TextField
              size="small"
              label="callFlowPolicy（JSON：silenceTimeoutMs 等）"
              multiline
              minRows={3}
              value={jsonFieldValue(callFlowPolicy)}
              onChange={function (e): void {
                try {
                  const next = JSON.parse(e.target.value) as unknown;
                  if (next && typeof next === "object") {
                    edit.setCharacter({
                      ...edit.character!,
                      callFlowPolicy: next,
                    });
                  }
                } catch {
                  // typing
                }
              }}
            />

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                disabled={edit.busy}
                onClick={function (): void {
                  void (async function (): Promise<void> {
                    const ok = await edit.saveCharacter();
                    if (ok) await refresh();
                  })();
                }}
              >
                保存 CharacterDef
              </Button>
              <Button
                color="error"
                variant="outlined"
                disabled={edit.busy}
                onClick={function (): void {
                  void (async function (): Promise<void> {
                    const ok = await edit.deleteCharacter();
                    if (ok) await refresh();
                  })();
                }}
              >
                删除角色
              </Button>
            </Stack>

            {!narrativeOnly && edit.character.freeCardId ? (
              <>
                <Typography variant="subtitle1" sx={{ pt: 1 }}>
                  FreeCallCard：{String(edit.character.freeCardId)}
                </Typography>
                <p className={styles.path}>
                  characters/free-cards/
                  {String(edit.character.freeCardId)}.s-card.json
                </p>
                <TextField
                  multiline
                  minRows={12}
                  fullWidth
                  size="small"
                  value={edit.freeCardJson}
                  onChange={function (e): void {
                    edit.setFreeCardJson(e.target.value);
                  }}
                  sx={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: 12,
                  }}
                />
                <Button
                  variant="outlined"
                  disabled={edit.busy || !edit.freeCard}
                  onClick={function (): void {
                    void edit.saveFreeCard();
                  }}
                >
                  保存 FreeCallCard
                </Button>
              </>
            ) : null}
          </Stack>
        </div>
      ) : null}
    </section>
  );
}
