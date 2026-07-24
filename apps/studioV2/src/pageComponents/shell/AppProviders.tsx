/**
	* 根 Providers：MUI Cache + Theme + 多域 store 挂载点。
	* 业务会话态进 stores/<domain>/；禁止扩 studioV2Store 上帝切片。
	*/
"use client";

import type { FC, ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { studioV2Theme } from "@studio-v2/src/pageComponents/theme/studioV2Theme";
// 引用了DomainStoresProviders组件，用于多域 store 挂载边界
import { DomainStoresProviders } from "@studio-v2/src/pageComponents/shell/DomainStoresProviders";

export interface AppProvidersProps {
	children: ReactNode;
}

export const AppProviders: FC<AppProvidersProps> = function ({
	// children 是 Next layout 下的页面子树
	children,
}) {
	return (
		// 引用了AppRouterCacheProvider组件，用于 MUI 与 Next App Router 样式缓存
		<AppRouterCacheProvider>
			{/* 引用了ThemeProvider组件，用于注入 Studio V2 暗色主题 */}
			<ThemeProvider theme={studioV2Theme}>
				{/* 引用了CssBaseline组件，用于统一浏览器默认样式基线 */}
				<CssBaseline />
				{/* 引用了DomainStoresProviders组件，用于多域 store 挂载边界 */}
				<DomainStoresProviders>{children}</DomainStoresProviders>
			</ThemeProvider>
		</AppRouterCacheProvider>
	);
};
