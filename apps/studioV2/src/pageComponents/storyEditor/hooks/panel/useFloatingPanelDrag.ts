/**
	* 属性浮窗布局：标题栏拖移 + 右下角拖改宽高。
	* left/top/width/height 均相对 offsetParent（画布叠层）。
	*/
"use client";

import {
	useRef,
	useState,
	type MouseEvent as ReactMouseEvent,
	type CSSProperties,
} from "react";

const MIN_WIDTH = 320;
const MIN_HEIGHT = 280;

/** 布局 hook：根 ref、合并样式、拖移/缩放回调 */
export type FloatingPanelLayout = {
	/** 绑到浮窗根节点 */
	panelRef: React.MutableRefObject<HTMLElement | null>;
	/** 覆盖默认 CSS 的定位与尺寸；未交互为 undefined */
	panelStyle: CSSProperties | undefined;
	/** 标题栏按下：开始拖移 */
	onDragStart: (e: ReactMouseEvent) => void;
	/** 右下角手柄按下：开始缩放 */
	onResizeStart: (e: ReactMouseEvent) => void;
};

/** @deprecated 兼容旧名；请用 FloatingPanelLayout */
export type FloatingPanelDrag = FloatingPanelLayout;

type PanelBox = {
	left: number;
	top: number;
	width: number;
	height: number;
};

/** 读 offsetParent 的视口矩形；无父级时回落视口 */
function readParentRect(
	panel: HTMLElement,
): DOMRect | { left: number; top: number; width: number; height: number } {
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

function clamp(n: number, min: number, max: number): number {
	return Math.min(Math.max(min, n), max);
}

/**
	* 属性浮窗拖移与缩放；交互后把几何钉死为绝对 left/top/width/height。
	*/
export function useFloatingPanelLayout(): FloatingPanelLayout {
	const [box, setBox] = useState<PanelBox | null>(null);
	const panelRef = useRef<HTMLElement | null>(null);

	function captureCurrentBox(panel: HTMLElement): PanelBox {
		const rect = panel.getBoundingClientRect();
		const parentRect = readParentRect(panel);
		return {
			left: rect.left - parentRect.left,
			top: rect.top - parentRect.top,
			width: rect.width,
			height: rect.height,
		};
	}

	function onDragStart(e: ReactMouseEvent): void {
		const panel = panelRef.current;
		if (!panel) return;
		const parentRect = readParentRect(panel);
		const current = box ?? captureCurrentBox(panel);
		const startX = e.clientX;
		const startY = e.clientY;
		function onMove(ev: MouseEvent): void {
			const maxLeft = Math.max(8, parentRect.width - current.width - 8);
			const maxTop = Math.max(8, parentRect.height - 48);
			setBox({
				...current,
				left: clamp(current.left + ev.clientX - startX, 8, maxLeft),
				top: clamp(current.top + ev.clientY - startY, 8, maxTop),
			});
		}
		function onUp(): void {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		}
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		e.preventDefault();
	}

	function onResizeStart(e: ReactMouseEvent): void {
		const panel = panelRef.current;
		if (!panel) return;
		e.stopPropagation();
		const parentRect = readParentRect(panel);
		const current = box ?? captureCurrentBox(panel);
		const startX = e.clientX;
		const startY = e.clientY;
		function onMove(ev: MouseEvent): void {
			const maxW = Math.max(
				MIN_WIDTH,
				parentRect.width - current.left - 8,
			);
			const maxH = Math.max(
				MIN_HEIGHT,
				parentRect.height - current.top - 8,
			);
			setBox({
				...current,
				width: clamp(
					current.width + ev.clientX - startX,
					MIN_WIDTH,
					maxW,
				),
				height: clamp(
					current.height + ev.clientY - startY,
					MIN_HEIGHT,
					maxH,
				),
			});
		}
		function onUp(): void {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		}
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		e.preventDefault();
	}

	const panelStyle: CSSProperties | undefined =
		box === null
			? undefined
			: {
					left: box.left,
					top: box.top,
					right: "auto",
					width: box.width,
					height: box.height,
					maxWidth: "none",
					maxHeight: "none",
				};

	return { panelRef, panelStyle, onDragStart, onResizeStart };
}

/** 兼容旧 import 名 */
export function useFloatingPanelDrag(): FloatingPanelLayout {
	return useFloatingPanelLayout();
}
