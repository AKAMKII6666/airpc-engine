/**
 * 模块名称：Studio 根 Layout
 */
import type { Metadata } from "next";
import { type ReactNode } from "react";
import { AppProviders } from "@studio/uiComponents/providers/AppProviders";

export const metadata: Metadata = {
  title: "airpc-engine Studio",
  description: "AI-RPG NPC 引擎 · B/S Studio",
};

export default function RootLayout(props: { children: ReactNode }) {
  const { children } = props;
  return (
    <html lang="zh-CN">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
