/**
 * 模块名称：资源台（全局 data/assets）
 */
"use client";

import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useAssetsShellBis } from "@studio/bis/shell/assets.shell.bis";
import { useAssetsEditBis } from "@studio/bis/assets/assetsEdit.bis";
import styles from "./assets.module.scss";

const KIND_OPTIONS = ["wav", "tts", "prompt_clip", "image"] as const;

export default function AssetsPage() {
  const { assets, loading, error, refresh } = useAssetsShellBis();
  const edit = useAssetsEditBis();

  return (
    <section className={styles.page}>
      <Typography component="h1" variant="h5" className={styles.title}>
        资源台
      </Typography>
      <p className={styles.lead}>
        维护全局资产元数据与
        <code> data/assets/files/ </code>
        文件。卡上
        <code> playbackClipId </code>
        只引用
        <code> assetId </code>
        ；真播放仍由壳／Adapter 执行（本台负责存在性）。
      </p>

      {loading ? <CircularProgress size={24} /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {edit.error ? <Alert severity="error">{edit.error}</Alert> : null}

      <div className={styles.createBar}>
        <Button
          variant="outlined"
          disabled={edit.busy}
          onClick={function (): void {
            edit.selectNew();
          }}
        >
          新建资产
        </Button>
        <Button
          variant="text"
          disabled={edit.busy}
          onClick={function (): void {
            void refresh();
          }}
        >
          刷新列表
        </Button>
      </div>

      <div className={styles.list}>
        {assets.map(function (asset) {
          const selected = !edit.isNew && edit.draft.assetId === asset.assetId;
          return (
            <button
              key={asset.assetId}
              type="button"
              className={[styles.card, selected ? styles.cardSelected : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={function (): void {
                void edit.loadAsset(asset.assetId);
              }}
            >
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>
                  {asset.displayName || asset.assetId}
                </h2>
                <Chip
                  size="small"
                  label={asset.fileExists === false ? "文件缺失" : asset.kind}
                  color={asset.fileExists === false ? "warning" : "default"}
                />
              </div>
              <p className={styles.meta}>assetId: {asset.assetId}</p>
              <p className={styles.path}>{asset.uri}</p>
            </button>
          );
        })}
      </div>

      <div className={styles.editor}>
        <Typography variant="subtitle1">
          {edit.isNew ? "登记新资产" : `编辑 ${edit.draft.assetId}`}
        </Typography>
        <div className={styles.fields}>
          <TextField
            size="small"
            label="assetId"
            disabled={!edit.isNew}
            value={edit.draft.assetId}
            helperText="小写开头 snake_case"
            onChange={function (e): void {
              edit.setField("assetId", e.target.value);
            }}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>kind</InputLabel>
            <Select
              label="kind"
              value={edit.draft.kind}
              onChange={function (e): void {
                edit.setKind(
                  e.target.value as (typeof KIND_OPTIONS)[number],
                );
              }}
            >
              {KIND_OPTIONS.map(function (k) {
                return (
                  <MenuItem key={k} value={k}>
                    {k}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="uri（相对 data/assets/）"
            value={edit.draft.uri}
            onChange={function (e): void {
              edit.setField("uri", e.target.value);
            }}
          />
          <TextField
            size="small"
            label="displayName"
            value={edit.draft.displayName ?? ""}
            onChange={function (e): void {
              edit.setField("displayName", e.target.value);
            }}
          />
          <TextField
            size="small"
            label="transcript"
            value={edit.draft.transcript ?? ""}
            onChange={function (e): void {
              edit.setField("transcript", e.target.value);
            }}
          />
          <Button variant="outlined" component="label" disabled={edit.busy}>
            {edit.fileName ? `已选：${edit.fileName}` : "选择文件（可选）"}
            <input
              hidden
              type="file"
              onChange={function (e): void {
                const f = e.target.files?.[0] ?? null;
                edit.setLocalFile(f);
              }}
            />
          </Button>
          {!edit.isNew && edit.draft.fileExists === false ? (
            <Alert severity="warning">
              元数据存在但文件缺失（校验会报 ASSET_URI_MISSING）。请上传文件或修正
              uri。
            </Alert>
          ) : null}
        </div>
        <div className={styles.actions}>
          <Button
            variant="contained"
            disabled={edit.busy}
            onClick={function (): void {
              void (async function (): Promise<void> {
                const ok = await edit.save();
                if (ok) await refresh();
              })();
            }}
          >
            保存
          </Button>
          {!edit.isNew ? (
            <Button
              color="error"
              variant="outlined"
              disabled={edit.busy}
              onClick={function (): void {
                void (async function (): Promise<void> {
                  const ok = await edit.remove();
                  if (ok) await refresh();
                })();
              }}
            >
              删除
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
