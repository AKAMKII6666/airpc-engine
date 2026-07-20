/**
 * 资源库列表行：紧凑元信息 + 可用性角标；行内可触发删除确认。
 */
"use client";

import type { FC, MouseEvent } from "react";
import { Button } from "@mui/material";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import {
  assetAvailabilityLabel,
  assetKindLabel,
  formatAssetMeasure,
} from "@studio-v2/typeFiles/library/labels/libraryLabels";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

function availBadge(a: string): string {
  if (a === "ready") return styles.badgeOk;
  if (a === "missing") return styles.badgeDanger;
  return styles.badgeMuted;
}

export type AssetLibraryListProps = {
  items: readonly AssetSummary[];
  selectedId: string | undefined;
  onSelect: (assetId: string) => void;
  /**
   * 请求删除指定资源；由父级打开确认弹层。
   * 不在列表内直接 mutate mock。
   */
  onRequestDelete: (assetId: string) => void;
};

export const AssetLibraryList: FC<AssetLibraryListProps> = function (props) {
  const { items, selectedId, onSelect, onRequestDelete } = props;
  return (
    <section className={styles.listPane} aria-label="资源列表">
      <ul className={styles.list}>
        {items.map((a) => {
          const active = a.assetId === selectedId;
          return (
            <li key={a.assetId}>
              <div className={active ? styles.rowActive : styles.row}>
                <button
                  type="button"
                  className={styles.rowSelect}
                  onClick={() => onSelect(a.assetId)}
                >
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitle}>{a.displayName}</span>
                    <span className={styles.rowMeta}>
                      {assetKindLabel(a.kind)} · {a.format || "—"} ·{" "}
                      {formatAssetMeasure(a.measureValue, a.measureUnit)} · 引用{" "}
                      {a.refCount}
                    </span>
                  </span>
                  <span className={availBadge(a.availability)}>
                    {assetAvailabilityLabel(a.availability)}
                  </span>
                </button>
                <Button
                  type="button"
                  size="small"
                  color="error"
                  variant="text"
                  className={styles.rowDelete}
                  aria-label={`删除 ${a.displayName}`}
                  onClick={(event: MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    onRequestDelete(a.assetId);
                  }}
                >
                  删除
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
