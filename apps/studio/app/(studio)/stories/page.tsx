/**
 * 模块名称：故事列表页
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, CircularProgress, Typography } from "@mui/material";
import { useStoriesShellBis } from "@studio/bis/shell/stories.shell.bis";
import { UserGate } from "@studio/uiComponents/userGate/UserGate";
import {
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import styles from "./stories.module.scss";

export default function StoriesPage() {
  useStoriesShellBis();
  const router = useRouter();
  const [gateOpen, setGateOpen] = useState(false);
  const [pendingPackageId, setPendingPackageId] = useState<string | null>(
    null,
  );

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
      <Typography component="h1" variant="h5" className={styles.title}>
        故事包列表
      </Typography>
      <p className={styles.lead}>
        点击故事 → 若未选用户先弹出 UserGate → 进入画布（P3 占位只读）。
      </p>
      {loading ? <CircularProgress size={24} /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <div className={styles.list}>
        {items.map(function (item) {
          return (
            <button
              key={item.packageId}
              type="button"
              className={styles.card}
              onClick={function (): void {
                openStory(item.packageId);
              }}
            >
              <p className={styles.cardTitle}>{item.title}</p>
              <p className={styles.meta}>
                {item.packageId} · schema {item.schemaVersion} ·{" "}
                {item.cardCount} 卡
              </p>
            </button>
          );
        })}
      </div>

      <UserGate
        open={gateOpen}
        onClose={function (): void {
          setGateOpen(false);
          setPendingPackageId(null);
        }}
        onSelected={function (): void {
          setGateOpen(false);
          if (pendingPackageId) {
            router.push(`/stories/${encodeURIComponent(pendingPackageId)}`);
          }
        }}
      />
    </section>
  );
}
