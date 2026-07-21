/**
	* 底栏 toolMode 归约与 RF 交互投影回归。
	*/
import { describe, expect, it } from "vitest";
import {
	activeDockToolIdFromState,
	cancelDockToolMode,
	normalizeDockToolMode,
	reactFlowInteractionForToolMode,
	reduceDockToolClick,
} from "@studio-v2/src/bis/pageBis/storyEditor/dock/dockToolMode";
import { IDLE_DOCK_TOOL_MODE } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";

describe("reduceDockToolClick", () => {
	it("enters placement and toggles off on same icon", () => {
		const enter = reduceDockToolClick(IDLE_DOCK_TOOL_MODE, "add_callcard");
		expect(enter.next).toEqual({
			mode: "placement",
			placementKind: "story",
		});
		expect(enter.effect).toBe("none");
		const leave = reduceDockToolClick(enter.next, "add_callcard");
		expect(leave.next).toEqual(IDLE_DOCK_TOOL_MODE);
	});

	it("keeps fit as instantaneous effect without mode change", () => {
		const selected = reduceDockToolClick(IDLE_DOCK_TOOL_MODE, "select");
		const fit = reduceDockToolClick(selected.next, "fit");
		expect(fit.effect).toBe("fitView");
		expect(fit.next).toEqual(selected.next);
	});

	it("returns to idle pan when clicking pan from select", () => {
		const select = reduceDockToolClick(IDLE_DOCK_TOOL_MODE, "select");
		expect(select.next.mode).toBe("select");
		const pan = reduceDockToolClick(select.next, "pan");
		expect(pan.next).toEqual(IDLE_DOCK_TOOL_MODE);
	});

	it("leaves placement when entering select", () => {
		const place = reduceDockToolClick(IDLE_DOCK_TOOL_MODE, "add_callcard");
		const select = reduceDockToolClick(place.next, "select");
		expect(select.next).toEqual({
			mode: "select",
			placementKind: null,
		});
	});
});

describe("activeDockToolIdFromState / interaction", () => {
	it("maps placement and idle to highlight ids", () => {
		expect(
			activeDockToolIdFromState({
				mode: "placement",
				placementKind: "chapter_end",
			}),
		).toBe("chapter_end");
		expect(
			activeDockToolIdFromState({
				mode: "select",
				placementKind: null,
			}),
		).toBe("select");
		expect(activeDockToolIdFromState(IDLE_DOCK_TOOL_MODE)).toBe("pan");
	});

	it("projects selectionOnDrag only in select mode", () => {
		expect(reactFlowInteractionForToolMode("select").selectionOnDrag).toBe(
			true,
		);
		expect(reactFlowInteractionForToolMode("idle").panOnDrag).toBe(true);
		expect(
			reactFlowInteractionForToolMode("select").nodesConnectable,
		).toBe(false);
		expect(reactFlowInteractionForToolMode("placement").cursor).toBe(
			"crosshair",
		);
	});

	it("normalizes invalid placement back to idle", () => {
		expect(normalizeDockToolMode("placement", null)).toEqual(
			IDLE_DOCK_TOOL_MODE,
		);
		expect(cancelDockToolMode()).toEqual(IDLE_DOCK_TOOL_MODE);
	});
});
