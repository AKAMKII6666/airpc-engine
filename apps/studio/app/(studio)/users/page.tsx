/**
 * 模块名称：用户台（UserGate + SaveGame 导出）
 */
"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useUserGateBis } from "@studio/bis/users/userGate.bis";
import {
  useStudioStore,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import {
  downloadSaveGameExport,
  saveBlobAsFile,
} from "@studio/utils/ajaxHelper/studio.ajax";
import styles from "./users.module.scss";

export default function UsersPage() {
  const gate = useUserGateBis();
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { userId, userNickname } = useStudioStoreShallow(function (s) {
    return {
      userId: s.layout.userId,
      userNickname: s.layout.userNickname,
    };
  });
  const setLayoutUserId = useStudioStore((s) => s.setLayoutUserId);

  return (
    <section className={styles.page}>
      <Typography component="h1" variant="h5" className={styles.title}>
        用户台
      </Typography>
      <p className={styles.lead}>
        无密码门禁。选定用户后建立本机 Profile 调试上下文；故事编辑本身不依赖用户。
      </p>

      <div className={styles.current}>
        <Typography variant="subtitle2">当前选择</Typography>
        <p className={styles.currentValue}>
          {userId
            ? `${userNickname ?? userId}（${userId}）`
            : "尚未选择"}
        </p>
        <Button
          size="small"
          variant="outlined"
          disabled={!userId || exporting}
          onClick={function (): void {
            if (!userId) return;
            void (async function (): Promise<void> {
              setExporting(true);
              setExportError(null);
              const res = await downloadSaveGameExport(userId);
              setExporting(false);
              if (!res.ok || !res.blob) {
                setExportError(res.message ?? "导出失败");
                return;
              }
              saveBlobAsFile(
                res.blob,
                res.filename ?? `${userId}-profile.save.json`,
              );
            })();
          }}
        >
          导出 SaveGame
        </Button>
        {exportError ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {exportError}
          </Alert>
        ) : null}
      </div>

      {gate.loading ? <CircularProgress size={24} /> : null}
      {gate.error ? <Alert severity="error">{gate.error}</Alert> : null}

      <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
        本地用户列表
      </Typography>
      <List dense className={styles.list}>
        {gate.users.map(function (u) {
          const selected = u.userId === userId;
          return (
            <ListItem key={u.userId} disablePadding secondaryAction={
              u.userId !== "demo-user" ? (
                <Button
                  size="small"
                  color="error"
                  onClick={function (): void {
                    void gate.deleteUser(u.userId);
                  }}
                >
                  删除
                </Button>
              ) : undefined
            }>
              <ListItemButton
                selected={selected}
                disabled={gate.loading}
                onClick={function (): void {
                  void (async function (): Promise<void> {
                    const ok = await gate.selectUser(u.userId);
                    if (ok) {
                      setLayoutUserId(u.userId, u.nickname);
                    }
                  })();
                }}
              >
                <ListItemText
                  primary={u.nickname}
                  secondary={u.userId}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        新建用户
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          label="userId"
          value={newId}
          onChange={function (e): void {
            setNewId(e.target.value);
          }}
        />
        <TextField
          size="small"
          label="昵称"
          value={newName}
          onChange={function (e): void {
            setNewName(e.target.value);
          }}
        />
        <Button
          variant="contained"
          disabled={!newId || !newName || gate.loading}
          onClick={function (): void {
            void (async function (): Promise<void> {
              const ok = await gate.createUser(newId, newName);
              if (ok) {
                setNewId("");
                setNewName("");
              }
            })();
          }}
        >
          新建并选择
        </Button>
        <Button size="small" onClick={gate.reload}>
          刷新
        </Button>
      </Stack>
    </section>
  );
}
