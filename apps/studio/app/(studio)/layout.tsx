/**
 * 模块名称：Studio 分组 Layout
 */
"use client";

import Link from "next/link";
import { type FC, type ReactNode, useEffect } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { useStudioLayoutShellBis } from "@studio/bis/shell/studioLayout.shell.bis";
import {
  useStudioStore,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import styles from "./studioShell.module.scss";

export interface IStudioGroupLayoutProps {
  children: ReactNode;
}

function readUserCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )airpc_userId=([^;]*)/);
  return match ? decodeURIComponent(match[1]!) : null;
}

const StudioGroupLayout: FC<IStudioGroupLayoutProps> = function (props) {
  const { children } = props;
  useStudioLayoutShellBis();

  const { userId, userNickname, bannerError, schemaDialog } =
    useStudioStoreShallow(function (s) {
      return {
        userId: s.layout.userId,
        userNickname: s.layout.userNickname,
        bannerError: s.layout.bannerError,
        schemaDialog: s.layout.schemaDialog,
      };
    });
  const setLayoutUserId = useStudioStore((s) => s.setLayoutUserId);
  const setSchemaDialog = useStudioStore((s) => s.setSchemaDialog);

  useEffect(
    function (): void {
      if (userId) return;
      const fromCookie = readUserCookie();
      if (fromCookie) {
        setLayoutUserId(fromCookie, null);
      }
    },
    [userId, setLayoutUserId],
  );

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <p className={styles.brand}>airpc-engine · Studio</p>
        <nav className={styles.nav}>
          <Link href="/stories">故事</Link>
          <Link href="/debugger">调试</Link>
          <span className={styles.userChip}>
            {userId
              ? `用户：${userNickname ?? userId}`
              : "未选用户"}
          </span>
        </nav>
      </header>
      {bannerError ? (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          {bannerError}
        </Alert>
      ) : null}
      <main className={styles.main}>{children}</main>

      <Dialog
        open={Boolean(schemaDialog?.open)}
        onClose={function (): void {
          setSchemaDialog(null);
        }}
      >
        <DialogTitle>内容版本不兼容</DialogTitle>
        <DialogContent>
          {schemaDialog?.message ??
            "此内容由更新版引擎编写，请升级 Studio"}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={function (): void {
              setSchemaDialog(null);
            }}
          >
            知道了
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default StudioGroupLayout;
