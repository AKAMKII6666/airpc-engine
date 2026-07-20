/**
 * 跨页删除确认壳：展示目标名 + 引用摘要 + 错误区。
 * 领域文案由调用方注入；不写盘、不编排删除事务。
 */
"use client";

import type { FC } from "react";
import { Button, Typography } from "@mui/material";
import { AppModal } from "@studio-v2/src/commonUiComponents/modal/app/AppModal";
import styles from "./index.module.scss";

export type DeleteConfirmModalProps = {
  open: boolean;
  /** 弹层标题，如「确认删除角色」 */
  title: string;
  /** 标题下说明；须明示会话内移除、不写盘 */
  description: string;
  /**
   * 即将删除对象的人类可读名称。
   * open=true 时由调用方保证有值；关闭态可为空串。
   */
  displayName: string;
  /** 引用摘要行；只读投影，空数组时展示「当前无引用记录」 */
  referenceLines: readonly string[];
  error: string | undefined;
  onClose: () => void;
  onConfirm: () => void;
};

export const DeleteConfirmModal: FC<DeleteConfirmModalProps> = function (
  props,
) {
  const {
    open,
    title,
    description,
    displayName,
    referenceLines,
    error,
    onClose,
    onConfirm,
  } = props;

  return (
    <AppModal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button color="error" variant="contained" onClick={onConfirm}>
            确认删除
          </Button>
        </>
      }
    >
      {open ? (
        <>
          <Typography variant="body2">即将删除「{displayName}」。</Typography>
          {referenceLines.length > 0 ? (
            <ul className={styles.refList}>
              {referenceLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <Typography variant="body2" color="text.secondary">
              当前无引用记录。
            </Typography>
          )}
          {error ? (
            <Typography variant="body2" color="error" role="alert">
              {error}
            </Typography>
          ) : null}
        </>
      ) : null}
    </AppModal>
  );
};
