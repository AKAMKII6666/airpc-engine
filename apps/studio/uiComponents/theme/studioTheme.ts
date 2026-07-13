/**
 * 模块名称：MUI 主题（简体中文 Studio）
 */
"use client";

import { createTheme } from "@mui/material/styles";

export const studioTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1a5f4a",
    },
    secondary: {
      main: "#5c6b73",
    },
    background: {
      default: "#f4f6f5",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: [
      '"Noto Sans SC"',
      '"PingFang SC"',
      '"Microsoft YaHei"',
      "sans-serif",
    ].join(","),
  },
});
