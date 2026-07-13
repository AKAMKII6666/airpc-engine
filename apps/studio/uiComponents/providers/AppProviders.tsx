/**
 * 模块名称：AppProviders
 * 模块说明：MUI Theme + StudioStoreProvider。
 */
"use client";

import { type FC, type ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { StudioStoreProvider } from "@studio/store/storeContext/studioStoreContext";
import { studioTheme } from "@studio/uiComponents/theme/studioTheme";

export interface IAppProvidersProps {
  children: ReactNode;
}

export const AppProviders: FC<IAppProvidersProps> = function (props) {
  const { children } = props;
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={studioTheme}>
        <CssBaseline />
        <StudioStoreProvider>{children}</StudioStoreProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
};
