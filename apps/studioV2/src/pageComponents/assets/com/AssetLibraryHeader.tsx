/**
 * 资源库页头：标题说明 + 上传入口。
 */
"use client";

import type { FC } from "react";
import { Button, Typography } from "@mui/material";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export type AssetLibraryHeaderProps = {
  onUpload: () => void;
};

export const AssetLibraryHeader: FC<AssetLibraryHeaderProps> = function (
  props,
) {
  const { onUpload } = props;
  return (
    <header className={styles.header}>
      <div>
        <Typography variant="h5" component="h1" className={styles.title}>
          资源库
        </Typography>
        <Typography variant="body2" className={styles.sub}>
          管理项目内可引用的外部文件；上传后由系统自动生成资源记录。
        </Typography>
      </div>
      <div className={styles.actions}>
        <Button variant="contained" size="small" onClick={onUpload}>
          上传资源
        </Button>
      </div>
    </header>
  );
};
