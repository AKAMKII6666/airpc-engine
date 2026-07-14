/**
 * 模块名称：画布连线出口类型选择
 */
"use client";

import type { FC } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import {
  EXIT_CONNECT_KIND_OPTIONS,
  type ExitConnectKind,
} from "@studio/bis/storyEditor/storyExitEdges.bis";

export interface IExitConnectDialogProps {
  open: boolean;
  sourceCardId: string | null;
  targetCardId: string | null;
  value: ExitConnectKind;
  onChange: (kind: ExitConnectKind) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ExitConnectDialog: FC<IExitConnectDialogProps> = function (props) {
  const {
    open,
    sourceCardId,
    targetCardId,
    value,
    onChange,
    onCancel,
    onConfirm,
  } = props;

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>选择出口类型</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {sourceCardId} → {targetCardId}
          。真源写入 exits[].effects；禁止默认写死单一 inbound。
        </Typography>
        <FormControl>
          <RadioGroup
            value={value}
            onChange={function (_e, next): void {
              onChange(next as ExitConnectKind);
            }}
          >
            {EXIT_CONNECT_KIND_OPTIONS.map(function (opt) {
              return (
                <FormControlLabel
                  key={opt.value}
                  value={opt.value}
                  control={<Radio />}
                  label={
                    <span>
                      <strong>{opt.label}</strong>
                      <Typography
                        component="span"
                        variant="caption"
                        display="block"
                        color="text.secondary"
                      >
                        {opt.hint}
                      </Typography>
                    </span>
                  }
                />
              );
            })}
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>取消</Button>
        <Button variant="contained" onClick={onConfirm}>
          确认连线
        </Button>
      </DialogActions>
    </Dialog>
  );
};
