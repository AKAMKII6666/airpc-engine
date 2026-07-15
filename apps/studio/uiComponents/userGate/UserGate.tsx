/**
 * 模块名称：UserGate 组件（无密码）
 */
"use client";

import { type FC, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useUserGateBis } from "@studio/bis/users/userGate.bis";

export interface IUserGateProps {
  open: boolean;
  onClose?: () => void;
  onSelected: (userId: string) => void;
  title?: string;
}

export const UserGate: FC<IUserGateProps> = function (props) {
  const { open, onClose, onSelected, title = "选择用户" } = props;
  const gate = useUserGateBis();
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {gate.error ? <Alert severity="error">{gate.error}</Alert> : null}
        <Typography variant="body2" sx={{ mb: 1 }}>
          无密码。选定后建立 Profile 调试上下文。
        </Typography>
        <List dense>
          {gate.users.map(function (u) {
            return (
              <ListItem
                key={u.userId}
                disablePadding
                secondaryAction={
                  u.userId !== "demo-user" ? (
                    <Button
                      size="small"
                      color="error"
                      disabled={gate.loading}
                      onClick={function (): void {
                        void gate.deleteUser(u.userId);
                      }}
                    >
                      删除
                    </Button>
                  ) : undefined
                }
              >
                <ListItemButton
                  disabled={gate.loading}
                  onClick={function (): void {
                    void (async function (): Promise<void> {
                      const ok = await gate.selectUser(u.userId);
                      if (ok) onSelected(u.userId);
                    })();
                  }}
                >
                  <ListItemText primary={u.nickname} secondary={u.userId} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
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
            variant="outlined"
            disabled={!newId || !newName || gate.loading}
            onClick={function (): void {
              void (async function (): Promise<void> {
                const ok = await gate.createUser(newId, newName);
                if (ok) onSelected(newId);
              })();
            }}
          >
            新建并选择
          </Button>
        </Stack>
        <Box sx={{ mt: 1 }}>
          <Button size="small" onClick={gate.reload}>
            刷新列表
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        {onClose ? (
          <Button onClick={onClose}>取消</Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
};
