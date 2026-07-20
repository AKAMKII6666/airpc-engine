/**
 * 应用壳：左侧主导航 + 主区装配。
 * `/stories/*` 进入全屏编辑器：隐藏主导航与主区 padding，避免挤占画布。
 */
"use client";

import type { FC, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Typography } from "@mui/material";
import {
  STUDIO_NAV_ITEMS,
  isNavItemActive,
} from "@studio-v2/src/pageComponents/shell/studioNavItems";
import { StudioLogoMark } from "@studio-v2/src/pageComponents/shell/StudioLogoMark";
import styles from "./StudioAppChrome.module.scss";

export type StudioAppChromeProps = {
  children: ReactNode;
};

/** 故事编辑器路由：全屏画布，不套工作台侧栏。 */
function isStoryEditorPath(pathname: string): boolean {
  return pathname === "/stories" || pathname.startsWith("/stories/");
}

export const StudioAppChrome: FC<StudioAppChromeProps> = function (props) {
  const { children } = props;
  const pathname = usePathname() ?? "/";
  const fullscreen = isStoryEditorPath(pathname);

  if (fullscreen) {
    return <div className={styles.fullscreen}>{children}</div>;
  }

  return (
    <div className={styles.root}>
      <aside className={styles.nav} aria-label="主导航">
        <div className={styles.brand}>
          <StudioLogoMark size={28} className={styles.logoMark} />
          <div className={styles.brandTextBlock}>
            <Typography variant="subtitle2" className={styles.brandText}>
              AirPC Studio
            </Typography>
            <span className={styles.brandBadge}>V2</span>
          </div>
        </div>
        <nav className={styles.navList}>
          {STUDIO_NAV_ITEMS.map((item) => {
            const active = isNavItemActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? styles.navLinkActive : styles.navLink}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className={styles.main}>{children}</div>
    </div>
  );
};
