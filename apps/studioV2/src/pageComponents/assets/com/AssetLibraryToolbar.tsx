/**
 * 资源库类型筛选条：全部 / WAV / BGM / 图片 / 文本 / 其它。
 */
"use client";

import type { FC } from "react";
import { TextField } from "@mui/material";
import type { AssetKind } from "@studio-v2/typeFiles/library/assets/assetSummary";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

const KIND_FILTERS: readonly { id: AssetKind | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "wav", label: "WAV" },
  { id: "bgm", label: "BGM" },
  { id: "image", label: "图片" },
  { id: "text", label: "文本" },
  { id: "other", label: "其它" },
];

export type AssetLibraryToolbarProps = {
  kind: AssetKind | "all";
  onKindChange: (kind: AssetKind | "all") => void;
};

export const AssetLibraryToolbar: FC<AssetLibraryToolbarProps> = function (
  props,
) {
  const { kind, onKindChange } = props;
  return (
    <div className={styles.toolbar}>
      <TextField
        size="small"
        placeholder="按资源名筛选（静态占位）"
        disabled
        className={styles.search}
        inputProps={{ "aria-label": "筛选资源" }}
      />
      <div className={styles.typeFilter} role="group" aria-label="类型筛选">
        {KIND_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={kind === f.id ? styles.typeChipActive : styles.typeChip}
            onClick={() => onKindChange(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
};
