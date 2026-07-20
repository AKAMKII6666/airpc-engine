/**
	* MUI 暗色主题：消费 typeFiles/theme/darkTokens，禁止浅色落地。
	* 输入框底色对齐色板 bg.input，避免默认透明边框在暗色面板上发灰。
	*/
"use client";

import { createTheme } from "@mui/material/styles";
import { darkTokens } from "@studio-v2/typeFiles/theme/darkTokens";

export const studioV2Theme = createTheme({
	palette: {
		mode: "dark",
		primary: {
			main: darkTokens.brand.primary,
			light: darkTokens.brand.primaryHover,
			dark: darkTokens.brand.primaryActive,
		},
		secondary: {
			main: darkTokens.brand.violet,
		},
		success: { main: darkTokens.state.success },
		warning: { main: darkTokens.state.warning },
		error: { main: darkTokens.state.danger },
		info: { main: darkTokens.state.info },
		background: {
			default: darkTokens.bg.app,
			paper: darkTokens.bg.panel,
		},
		text: {
			primary: darkTokens.text.primary,
			secondary: darkTokens.text.secondary,
			disabled: darkTokens.text.disabled,
		},
		divider: darkTokens.border.subtle,
	},
	typography: {
		fontFamily: [
			'"Noto Sans SC"',
			'"PingFang SC"',
			'"Microsoft YaHei"',
			"sans-serif",
		].join(","),
	},
	shape: {
		borderRadius: 8,
	},
	components: {
		MuiOutlinedInput: {
			styleOverrides: {
				root: {
					backgroundColor: darkTokens.bg.input,
					"& .MuiOutlinedInput-notchedOutline": {
						borderColor: darkTokens.border.subtle,
					},
					"&:hover .MuiOutlinedInput-notchedOutline": {
						borderColor: darkTokens.border.panel,
					},
					"&.Mui-focused .MuiOutlinedInput-notchedOutline": {
						borderColor: darkTokens.border.strong,
					},
					"&.Mui-disabled": {
						backgroundColor: darkTokens.bg.nodeMuted,
					},
				},
				input: {
					color: darkTokens.text.primary,
					"&::placeholder": {
						color: darkTokens.text.muted,
						opacity: 1,
					},
				},
			},
		},
		MuiInputLabel: {
			styleOverrides: {
				root: {
					color: darkTokens.text.secondary,
					"&.Mui-focused": {
						color: darkTokens.brand.primary,
					},
				},
			},
		},
		MuiFormHelperText: {
			styleOverrides: {
				root: {
					color: darkTokens.text.muted,
				},
			},
		},
	},
});
