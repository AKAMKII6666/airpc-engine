/**
	* 底栏工具项定义（细化修改 7 收口清单）。
	* 不含资源/包；不含多类型放置 / 连线模式 / 动作注释。
	*/
"use client";

import type { ReactElement } from "react";
import type { DockToolId } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";
import {
	IconAddCard,
	IconChapterEnd,
	IconFitView,
	IconPan,
	IconSelect,
} from "./DockToolIcons";

export type DockToolDef = {
	id: DockToolId;
	label: string;
	icon: ReactElement;
};

export const DOCK_TOOLS: readonly DockToolDef[] = [
	{
		id: "add_callcard",
		label: "新建 CallCard",
		// 引用了IconAddCard组件，用于新建通话卡入口
		icon: <IconAddCard fontSize="small" />,
	},
	{
		id: "chapter_end",
		label: "章节结束",
		// 引用了IconChapterEnd组件，用于章节结束入口
		icon: <IconChapterEnd fontSize="small" />,
	},
	{
		id: "pan",
		label: "平移",
		// 引用了IconPan组件，用于回到画布平移模式
		icon: <IconPan fontSize="small" />,
	},
	{
		id: "select",
		label: "框选",
		// 引用了IconSelect组件，用于框选模式入口
		icon: <IconSelect fontSize="small" />,
	},
	{
		id: "fit",
		label: "适配视图",
		// 引用了IconFitView组件，用于适配视图瞬时动作
		icon: <IconFitView fontSize="small" />,
	},
];
