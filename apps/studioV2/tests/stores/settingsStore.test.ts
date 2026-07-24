/**
	* settingsStore 结果型 action 回归：整包灌入 / stamp。
	*/
import { beforeEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "@studio-v2/src/stores/settings/settingsStore";
import type { SettingsSnapshot } from "@studio-v2/typeFiles/settings/store/settingsStoreState";

function sampleSnapshot(): SettingsSnapshot {
	return {
		nav: [{ id: "schema", label: "Schema" }],
		appearance: {
			theme: "dark",
			gridStrength: 40,
			edgeAnimation: true,
			highlightStrength: 70,
		},
		editor: {
			defaultZoomPercent: 100,
			showMinimap: false,
			showValidationFloat: true,
			autoSave: true,
			autoSaveIntervalSec: 30,
			defaultCardKindLabel: "剧情通话卡",
		},
		debugger: {
			defaultUserName: "u",
			defaultResetStory: true,
			showAdvancedLogs: false,
			clockStepSec: 60,
			recordRetainCount: 20,
		},
		importExport: {
			defaultExportKindLabel: "正式故事包",
			includeLayoutMeta: true,
			includeAssets: true,
			defaultExportDir: "",
			copyAssetsOnImport: true,
		},
		schema: {
			studioSchemaVersion: "s",
			engineSchemaVersion: "e",
			compat: "compatible",
			availableEffects: [],
			availableCardKinds: [],
			lastSyncedAt: null,
		},
		validationIssues: [],
	};
}

describe("settingsStore", () => {
	beforeEach(function () {
		useSettingsStore.getState().resetSettingsSession();
		useSettingsStore.setState({ refreshStamp: 0 });
	});

	it("applyLoadResult 成功灌快照", function () {
		useSettingsStore.getState().applyLoadStarted();
		expect(useSettingsStore.getState().loading).toBe(true);

		const snapshot = sampleSnapshot();
		useSettingsStore.getState().applyLoadResult({
			ok: true,
			snapshot,
		});

		const state = useSettingsStore.getState();
		expect(state.loading).toBe(false);
		expect(state.loadError).toBeUndefined();
		expect(state.snapshot?.nav[0]?.id).toBe("schema");
	});

	it("applyLoadResult 失败清空快照", function () {
		useSettingsStore.getState().applyLoadResult({
			ok: true,
			snapshot: sampleSnapshot(),
		});
		useSettingsStore.getState().applyLoadResult({
			ok: false,
			message: "boom",
		});
		const state = useSettingsStore.getState();
		expect(state.snapshot).toBeNull();
		expect(state.loadError).toBe("boom");
		expect(state.loading).toBe(false);
	});

	it("bumpSettingsRefreshStamp 递增", function () {
		useSettingsStore.getState().bumpSettingsRefreshStamp();
		expect(useSettingsStore.getState().refreshStamp).toBe(1);
	});
});
