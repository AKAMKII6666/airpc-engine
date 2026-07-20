/**
 * 资源库页头：标题说明 + 新建/上传入口（仅元数据 FormModal，不真上传）。
 */
"use client";

import type { FC } from "react";
import { Button, Typography } from "@mui/material";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export type AssetLibraryHeaderProps = {
  onCreate: () => void;
};

export const AssetLibraryHeader: FC<AssetLibraryHeaderProps> = function (
  props,
) {
  const { onCreate } = props;
  return (
    <header className={styles.header}>
      <div>
        <Typography variant="h5" component="h1" className={styles.title}>
          资源库
        </Typography>
        <Typography variant="body2" className={styles.sub}>
          管理故事包引用的素材。列表紧凑展示；不做媒体瀑布流。
        </Typography>
      </div>
      <div className={styles.actions}>
        <Button variant="contained" size="small" onClick={onCreate}>
          上传 / 新建资源
        </Button>
      </div>
    </header>
  );
};
