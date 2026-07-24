/**
	* 画布 → storyEditor store 双层同步：throttle + 显式 flush。
	* 保存 / 属性提交 / 切选中须 sync flush；禁仅靠裸 interval。
	*/
"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Edge, Node } from "@xyflow/react";
import { useStoryEditorStore } from "@studio-v2/src/stores/storyEditor/storyEditorStore";

/** 节流窗口；拖动中合并写 store，避免每帧灌账 */
const CANVAS_FLUSH_THROTTLE_MS = 300;

/** 画布取图口；与保存/校验定位共用最小面 */
export type CanvasFlushGraphApi = {
	/**
		* 当前 nodes/edges 浅拷贝快照。
		* 仅业务结构；不含每帧 viewport；调用方即时消费，勿长期持有可变引用。
		*/
	getGraphSnapshot: () => { nodes: Node[]; edges: Edge[] };
};

type CanvasFlushBisArgs = {
	/** 画布命令口；未挂载可为 null */
	getCanvasApi: () => CanvasFlushGraphApi | null;
};

/**
	* flushNow：同步写 flushedGraph。
	* scheduleFlush：标 pending + 节流；结构变更时调用。
	*/
export function useStoryEditorCanvasFlushBis(args: CanvasFlushBisArgs) {
	const { getCanvasApi } = args;
	const applyCanvasFlushResult = useStoryEditorStore(function (s) {
		return s.applyCanvasFlushResult;
	});
	const markCanvasPendingFlush = useStoryEditorStore(function (s) {
		return s.markCanvasPendingFlush;
	});
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	/** 首帧灌账不标 pending，避免打开即 dirty */
	const hydratedRef = useRef(false);

	const clearTimer = useCallback(function () {
		if (timerRef.current != null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const flushNow = useCallback(
		function (): boolean {
			const api = getCanvasApi();
			if (!api) return false;
			clearTimer();
			const { nodes, edges } = api.getGraphSnapshot();
			applyCanvasFlushResult({ nodes, edges });
			hydratedRef.current = true;
			return true;
		},
		[applyCanvasFlushResult, clearTimer, getCanvasApi],
	);

	const scheduleFlush = useCallback(
		function () {
			if (!hydratedRef.current) {
				flushNow();
				return;
			}
			markCanvasPendingFlush();
			if (timerRef.current != null) return;
			timerRef.current = setTimeout(function () {
				timerRef.current = null;
				flushNow();
			}, CANVAS_FLUSH_THROTTLE_MS);
		},
		[flushNow, markCanvasPendingFlush],
	);

	useEffect(
		function () {
			return function () {
				clearTimer();
			};
		},
		[clearTimer],
	);

	return {
		flushNow,
		scheduleFlush,
	};
}
