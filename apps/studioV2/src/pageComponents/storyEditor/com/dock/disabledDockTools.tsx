/**
	* 底栏禁用工具项定义；从 BottomToolBar 拆出以满足组件引用注释门禁。
	*/
"use client";

import type { ReactElement } from "react";
import {
	IconAction,
	IconAddCard,
	IconChapterEnd,
	IconComment,
	IconConnect,
	IconFitView,
	IconFreeCall,
	IconPlayback,
	IconSchedule,
	IconSelect,
} from "./DockToolIcons";

export type DisabledDockTool = {
	id: string;
	label: string;
	icon: ReactElement;
};

export const DISABLED_DOCK_TOOLS: readonly DisabledDockTool[] = [
	{
		id: "add_callcard",
		label: "新建 CallCard",
		// 引用了IconAddCard组件，用于新建 CallCard 占位
		icon: <IconAddCard fontSize="small" />,
	},
	{
		id: "playback",
		label: "过场播放卡",
		// 引用了IconPlayback组件，用于过场卡占位
		icon: <IconPlayback fontSize="small" />,
	},
	{
		id: "free",
		label: "自由通话卡",
		// 引用了IconFreeCall组件，用于自由通话卡占位
		icon: <IconFreeCall fontSize="small" />,
	},
	{
		id: "delay",
		label: "延迟外呼卡",
		// 引用了IconSchedule组件，用于延迟外呼卡占位
		icon: <IconSchedule fontSize="small" />,
	},
	{
		id: "chapter_end",
		label: "章节结束",
		// 引用了IconChapterEnd组件，用于章节结束占位
		icon: <IconChapterEnd fontSize="small" />,
	},
	{
		id: "action",
		label: "动作节点",
		// 引用了IconAction组件，用于动作节点占位
		icon: <IconAction fontSize="small" />,
	},
	{
		id: "comment",
		label: "注释分组",
		// 引用了IconComment组件，用于注释分组占位
		icon: <IconComment fontSize="small" />,
	},
	{
		id: "connect",
		label: "连线",
		// 引用了IconConnect组件，用于连线工具占位
		icon: <IconConnect fontSize="small" />,
	},
	{
		id: "select",
		label: "框选",
		// 引用了IconSelect组件，用于框选工具占位
		icon: <IconSelect fontSize="small" />,
	},
	{
		id: "fit",
		label: "适配视图",
		// 引用了IconFitView组件，用于适配视图占位
		icon: <IconFitView fontSize="small" />,
	},
];
