/**
	* 属性浮窗拖拽：按住标题栏移动浮窗，限制在父容器内保留可见。
	* left/top 必须相对 offsetParent（画布叠层），不能直接用视口坐标，否则会因顶栏偏移漂移。
	*/
"use client";

import {
	useRef,
	useState,
	type MouseEvent as ReactMouseEvent,
	type CSSProperties,
} from "react";

/** 拖拽 hook 返回：根节点 ref、当前定位样式、标题栏按下回调 */
export type FloatingPanelDrag = {
	/** 绑到浮窗根节点，用于拖拽时读取几何 */
	panelRef: React.MutableRefObject<HTMLElement | null>;
	/** 拖动后覆盖默认锚点的绝对定位样式；未拖动为 undefined */
	panelStyle: CSSProperties | undefined;
	/** 标题栏 onMouseDown；开始一次拖拽会话 */
	onDragStart: (e: ReactMouseEvent) => void;
};

/** 读 offsetParent 的视口矩形；无父级时回落视口原点 */
function readParentRect(panel: HTMLElement): DOMRect | { left: number; top: number; width: number; height: number } {
	const parent = panel.offsetParent;
	if (parent instanceof HTMLElement) {
		return parent.getBoundingClientRect();
	}
	return {
		left: 0,
		top: 0,
		width: window.innerWidth,
		height: window.innerHeight,
	};
}

export function useFloatingPanelDrag(): FloatingPanelDrag {
	// 拖拽位置（相对 offsetParent）；null=默认锚定（由 CSS 右上角），拖动后切换为绝对 left/top
	const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
	const panelRef = useRef<HTMLElement | null>(null);

	function onDragStart(e: ReactMouseEvent): void {
		const panel = panelRef.current;
		if (!panel) return;
		const rect = panel.getBoundingClientRect();
		const parentRect = readParentRect(panel);
		// 换算为相对父容器的坐标，避免把视口 Y（含顶栏）直接写入 CSS top 导致下跳
		const baseLeft = rect.left - parentRect.left;
		const baseTop = rect.top - parentRect.top;
		const startX = e.clientX;
		const startY = e.clientY;
		const width = rect.width;
		function onMove(ev: MouseEvent): void {
			const maxLeft = Math.max(8, parentRect.width - width - 8);
			// 底部至少保留约一个标题栏高度可见，避免拖出父容器后找不到
			const maxTop = Math.max(8, parentRect.height - 48);
			const left = Math.min(Math.max(8, baseLeft + ev.clientX - startX), maxLeft);
			const top = Math.min(Math.max(8, baseTop + ev.clientY - startY), maxTop);
			setPos({ left, top });
		}
		function onUp(): void {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		}
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		e.preventDefault();
	}

	const panelStyle =
		pos !== null
			? { left: pos.left, top: pos.top, right: "auto" as const }
			: undefined;

	return { panelRef, panelStyle, onDragStart };
}
