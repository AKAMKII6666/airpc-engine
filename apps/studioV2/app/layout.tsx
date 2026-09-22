/**
	* Studio V2 根 Layout：Providers + 导航壳；不含业务流程。
	*/
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@studio-v2/src/pageComponents/shell/providers/AppProviders";
import { StudioAppChrome } from "@studio-v2/src/pageComponents/shell/chrome/StudioAppChrome";
import "./globals.scss";

export const metadata: Metadata = {
	title: "AirPC Studio V2",
	description: "AI-RPG CallCard 故事工程工作台",
	icons: { icon: "/brand/logo-mark.svg" },
};

export default function RootLayout({
	// 当前路由页面内容，用于放入 Studio 应用壳。
	children,
}: {
	children: ReactNode;
}) {
	return (
		<html lang="zh-CN">
			<body>
				{/* 引用了AppProviders组件，用于注入应用级主题与状态。 */}
				<AppProviders>
					{/* 引用了StudioAppChrome组件，用于承载 Studio 导航与页面内容。 */}
					<StudioAppChrome>{children}</StudioAppChrome>
				</AppProviders>
			</body>
		</html>
	);
}
