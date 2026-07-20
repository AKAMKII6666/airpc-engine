/**
	* 底栏用的 Material 路径图标（MUI SvgIcon）。
	* 使用已有 @mui/material，避免额外依赖 @mui/icons-material；语义与官方 Icons 一致。
	*/
"use client";

import type { SvgIconProps } from "@mui/material/SvgIcon";
import SvgIcon from "@mui/material/SvgIcon";

function mdIcon(d: string, displayName: string) {
	const Icon = function DockMdIcon({
		// svgProps 透传给 SvgIcon，用于底栏路径图标样式
		...svgProps
	}: SvgIconProps) {
		return (
			// 引用了SvgIcon组件，用于渲染 Material 路径图标
			<SvgIcon {...svgProps} viewBox="0 0 24 24">
				<path d={d} />
			</SvgIcon>
		);
	};
	Icon.displayName = displayName;
	return Icon;
}

export const IconAddCard = mdIcon(
	"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z",
	"IconAddCard",
);

export const IconPlayback = mdIcon(
	"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z",
	"IconPlayback",
);

export const IconFreeCall = mdIcon(
	"M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
	"IconFreeCall",
);

export const IconSchedule = mdIcon(
	"M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
	"IconSchedule",
);

export const IconChapterEnd = mdIcon(
	"M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z",
	"IconChapterEnd",
);

export const IconAction = mdIcon(
	"M7 2v11h3v9l7-12h-4l4-8z",
	"IconAction",
);

export const IconComment = mdIcon(
	"M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z",
	"IconComment",
);

export const IconConnect = mdIcon(
	"M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z",
	"IconConnect",
);

export const IconSelect = mdIcon(
	"M3 5v4h2V5h4V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2z",
	"IconSelect",
);

export const IconFitView = mdIcon(
	"M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3h-6zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3v6zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42L5.3 17.3 3 15v6h6zm12-6l-2.3 2.3-2.87-2.89-1.42 1.42 2.89 2.87L15 21h6v-6z",
	"IconFitView",
);

export const IconAssets = mdIcon(
	"M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z",
	"IconAssets",
);

/** 包配置 docker 入口；语义对齐 Material Inventory2 */
export const IconPackage = mdIcon(
	"M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4l16-.02V7z",
	"IconPackage",
);
