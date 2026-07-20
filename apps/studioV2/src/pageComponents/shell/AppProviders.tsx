/**
 * 根 Providers：MUI Cache + 暗色 Theme。
 * Store 由各 feature 按需订阅；本步不注入巨型 Context。
 */
"use client";

import type { FC, ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { studioV2Theme } from "@studio-v2/src/pageComponents/theme/studioV2Theme";

export interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: FC<AppProvidersProps> = function (props) {
  const { children } = props;
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={studioV2Theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
};
