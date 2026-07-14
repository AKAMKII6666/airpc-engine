/**
 * 模块名称：故事列表页
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useStoriesShellBis } from "@studio/bis/shell/stories.shell.bis";
import { useStoriesCrudBis } from "@studio/bis/stories/storiesCrud.bis";
import { UserGate } from "@studio/uiComponents/userGate/UserGate";
import {
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import type { TStoryValidationStatus } from "@studio/types/frontEnd/store/studioStore.types";
import styles from "./stories.module.scss";

function validationChip(status: TStoryValidationStatus | undefined): {
  label: string;
  color: "success" | "warning" | "error" | "default";
} {
  switch (status) {
    case "ok":
      return { label: "校验通过", color: "success" };
    case "warning":
      return { label: "有警告", color: "warning" };
    case "error":
      return { label: "有错误", color: "error" };
    default:
      return { label: "未校验", color: "default" };
  }
}

export default function StoriesPage() {
  useStoriesShellBis();
  const crud = useStoriesCrudBis();
  const router = useRouter();
  const [gateOpen, setGateOpen] = useState(false);
  const [pendingPackageId, setPendingPackageId] = useState<string | null>(
    null,
  );
  const [pendingCreate, setPendingCreate] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createId, setCreateId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameId, setRenameId] = useState("");
  const [renameTitle, setRenameTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { items, loading, error, userId } = useStudioStoreShallow(function (s) {
    return {
      items: s.stories.items,
      loading: s.stories.loading,
      error: s.stories.error,
      userId: s.layout.userId,
    };
  });

  function openStory(packageId: string): void {
    if (!userId) {
      setPendingPackageId(packageId);
      setGateOpen(true);
      return;
    }
    router.push(`/stories/${encodeURIComponent(packageId)}`);
  }

  return (
    <section className={styles.page}>
      <div className={styles.headerRow}>
        <Typography component="h1" variant="h5" className={styles.title}>
          故事包列表
        </Typography>
        <Button
          variant="contained"
          onClick={function (): void {
            crud.setError(null);
            if (!userId) {
              setPendingCreate(true);
              setGateOpen(true);
              return;
            }
            setCreateId("");
            setCreateTitle("");
            setCreateOpen(true);
          }}
        >
          创建故事
        </Button>
      </div>
      <p className={styles.lead}>
        点击故事或创建故事 → 若未选用户先弹出 UserGate → 进入画布编辑器。
      </p>
      {loading ? <CircularProgress size={24} /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {crud.error ? <Alert severity="error">{crud.error}</Alert> : null}
      <div className={styles.list}>
        {items.map(function (item) {
          const badge = validationChip(item.validationStatus);
          return (
            <div key={item.packageId} className={styles.card}>
              <button
                type="button"
                className={styles.cardMain}
                onClick={function (): void {
                  openStory(item.packageId);
                }}
              >
                <div className={styles.cardHead}>
                  <p className={styles.cardTitle}>{item.title}</p>
                  <Chip size="small" color={badge.color} label={badge.label} />
                </div>
                <p className={styles.meta}>
                  {item.packageId} · schema {item.schemaVersion} ·{" "}
                  {item.cardCount} 卡
                  {typeof item.errorCount === "number"
                    ? ` · ${item.errorCount} error / ${item.warningCount ?? 0} warning`
                    : ""}
                </p>
              </button>
              <Stack direction="row" spacing={1} className={styles.cardActions}>
                <Button
                  size="small"
                  disabled={crud.busy}
                  onClick={function (): void {
                    setRenameTarget(item.packageId);
                    setRenameId(item.packageId);
                    setRenameTitle(item.title);
                    crud.setError(null);
                  }}
                >
                  重命名
                </Button>
                <Button
                  size="small"
                  color="error"
                  disabled={crud.busy}
                  onClick={function (): void {
                    setDeleteTarget(item.packageId);
                    crud.setError(null);
                  }}
                >
                  删除
                </Button>
              </Stack>
            </div>
          );
        })}
      </div>

      <Dialog
        open={createOpen}
        onClose={function (): void {
          setCreateOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>创建故事包</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="packageId"
              value={createId}
              helperText="小写字母开头的 snake_case"
              onChange={function (e): void {
                setCreateId(e.target.value);
              }}
            />
            <TextField
              label="标题"
              value={createTitle}
              onChange={function (e): void {
                setCreateTitle(e.target.value);
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={function (): void {
              setCreateOpen(false);
            }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            disabled={crud.busy || !createId.trim()}
            onClick={function (): void {
              void (async function (): Promise<void> {
                const id = createId.trim();
                const ok = await crud.createStory({
                  packageId: id,
                  title: createTitle.trim() || undefined,
                });
                if (ok) {
                  setCreateOpen(false);
                  router.push(`/stories/${encodeURIComponent(id)}`);
                }
              })();
            }}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={renameTarget !== null}
        onClose={function (): void {
          setRenameTarget(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>重命名故事包</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="packageId"
              value={renameId}
              onChange={function (e): void {
                setRenameId(e.target.value);
              }}
            />
            <TextField
              label="标题"
              value={renameTitle}
              onChange={function (e): void {
                setRenameTitle(e.target.value);
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={function (): void {
              setRenameTarget(null);
            }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            disabled={crud.busy || !renameTarget || !renameId.trim()}
            onClick={function (): void {
              if (!renameTarget) return;
              void (async function (): Promise<void> {
                const ok = await crud.renameStory(renameTarget, {
                  newPackageId: renameId.trim(),
                  title: renameTitle.trim(),
                });
                if (ok) setRenameTarget(null);
              })();
            }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onClose={function (): void {
          setDeleteTarget(null);
        }}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            将永久删除故事包 <strong>{deleteTarget}</strong>
            （含 cards / layout）。此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={function (): void {
              setDeleteTarget(null);
            }}
          >
            取消
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={crud.busy || !deleteTarget}
            onClick={function (): void {
              if (!deleteTarget) return;
              void (async function (): Promise<void> {
                const ok = await crud.removeStory(deleteTarget);
                if (ok) setDeleteTarget(null);
              })();
            }}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>

      <UserGate
        open={gateOpen}
        onClose={function (): void {
          setGateOpen(false);
          setPendingPackageId(null);
          setPendingCreate(false);
        }}
        onSelected={function (): void {
          setGateOpen(false);
          if (pendingCreate) {
            setPendingCreate(false);
            setCreateId("");
            setCreateTitle("");
            setCreateOpen(true);
            return;
          }
          if (pendingPackageId) {
            router.push(`/stories/${encodeURIComponent(pendingPackageId)}`);
          }
        }}
      />
    </section>
  );
}
