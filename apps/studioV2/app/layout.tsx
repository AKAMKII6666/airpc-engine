/**
 * Studio V2 根 Layout：Providers + 导航壳；不含业务流程。
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@studio-v2/src/pageComponents/shell/AppProviders";
import { StudioAppChrome } from "@studio-v2/src/pageComponents/shell/StudioAppChrome";
import "./globals.scss";

export const metadata: Metadata = {
  title: "AirPC Studio V2",
  description: "AI-RPG CallCard 故事工程工作台",
};

export default function RootLayout(props: { children: ReactNode }) {
  const { children } = props;
  return (
    <html lang="zh-CN">
      <body>
        <AppProviders>
          <StudioAppChrome>{children}</StudioAppChrome>
        </AppProviders>
      </body>
    </html>
  );
}
