/**
 * 设计系统静态验收条：展示 token 色板与布局层级，无业务编排。
 * 供 V1-U1 设计验收对照 色板参考.md；后续首页任务可替换为正式工作台内容。
 */
"use client";

import type { FC } from "react";
import { Typography } from "@mui/material";
import { darkTokens } from "@studio-v2/typeFiles/theme/darkTokens";
import { StudioLogoMark } from "@studio-v2/src/pageComponents/shell/StudioLogoMark";
import styles from "./DesignSystemStrip.module.scss";

const SWATCHES: { label: string; color: string }[] = [
  { label: "bg.app", color: darkTokens.bg.app },
  { label: "bg.panel", color: darkTokens.bg.panel },
  { label: "bg.canvas", color: darkTokens.bg.canvas },
  { label: "brand", color: darkTokens.brand.primary },
  { label: "cyan", color: darkTokens.brand.cyan },
  { label: "success", color: darkTokens.state.success },
  { label: "warning", color: darkTokens.state.warning },
  { label: "danger", color: darkTokens.state.danger },
];

export const DesignSystemStrip: FC = function () {
  return (
    <section className={styles.root} aria-label="设计系统壳">
      <div className={styles.brandRow}>
        <StudioLogoMark size={40} />
        <div>
          <Typography variant="subtitle1" className={styles.title}>
            AirPC Studio V2 · 设计系统壳
          </Typography>
          <Typography variant="body2" className={styles.caption}>
            暗色 token · 布局框架 · logo 参考已应用；本步无 Host 写口
          </Typography>
        </div>
      </div>
      <div className={styles.swatches}>
        {SWATCHES.map((s) => (
          <div key={s.label} className={styles.swatch}>
            <span
              className={styles.chip}
              style={{ background: s.color }}
              aria-hidden
            />
            <span className={styles.swatchLabel}>{s.label}</span>
          </div>
        ))}
      </div>
      <div className={styles.layers}>
        <div className={styles.layerApp}>app</div>
        <div className={styles.layerPanel}>panel</div>
        <div className={styles.layerElevated}>panelElevated</div>
      </div>
    </section>
  );
};
