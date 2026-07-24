/**
	* commitStoryEditorPackageSave flush 门闸：失败/缺快照不得 PUT。
	*/
import { beforeEach, describe, expect, it, vi } from "vitest";
import { commitStoryEditorPackageSave } from "@studio-v2/src/bis/pageBis/storyEditor/package/session/packageSessionSave";
import { useStoryEditorStore } from "@studio-v2/src/stores/storyEditor/storyEditorStore";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";

const saveStoryPackageToDisk = vi.fn();

vi.mock(
	"@studio-v2/src/bis/pageBis/storyEditor/package/io/saveStoryPackage_bis",
	function () {
		return {
			saveStoryPackageToDisk: function (
				...args: unknown[]
			): Promise<unknown> {
				return saveStoryPackageToDisk(...args);
			},
		};
	},
);

function minimalBundle(packageId: string): DiskStoryPackageBundle {
	return {
		conf: {
			schemaVersion: 1,
			packageId,
			title: packageId,
			participants: [],
			cards: [],
		},
		cards: [],
		layout: {
			schemaVersion: 1,
			packageId,
			nodes: [],
			edges: [],
		},
	};
}

describe("commitStoryEditorPackageSave", function () {
	beforeEach(function () {
		saveStoryPackageToDisk.mockReset();
		useStoryEditorStore.getState().resetStoryEditorSession();
		useStoryEditorStore.setState({ flushedGraph: null });
	});

	it("flush 返回 false 时不 PUT 且 applySaveFailure", async function () {
		const applySaveStarted = vi.fn();
		const applySaveSuccess = vi.fn();
		const applySaveFailure = vi.fn();

		await commitStoryEditorPackageSave({
			packageId: "pkg_a",
			bundle: minimalBundle("pkg_a"),
			flushCanvasToStore: function () {
				return false;
			},
			applySaveStarted,
			applySaveSuccess,
			applySaveFailure,
		});

		expect(applySaveFailure).toHaveBeenCalledWith({
			message: "画布未就绪，无法保存",
			validation: null,
		});
		expect(applySaveStarted).not.toHaveBeenCalled();
		expect(saveStoryPackageToDisk).not.toHaveBeenCalled();
		expect(applySaveSuccess).not.toHaveBeenCalled();
	});

	it("flush 成功但 flushedGraph 缺失时不 PUT", async function () {
		const applySaveStarted = vi.fn();
		const applySaveSuccess = vi.fn();
		const applySaveFailure = vi.fn();

		await commitStoryEditorPackageSave({
			packageId: "pkg_a",
			bundle: minimalBundle("pkg_a"),
			flushCanvasToStore: function () {
				useStoryEditorStore.setState({ flushedGraph: null });
				return true;
			},
			applySaveStarted,
			applySaveSuccess,
			applySaveFailure,
		});

		expect(applySaveFailure).toHaveBeenCalledWith({
			message: "画布快照缺失，无法保存",
			validation: null,
		});
		expect(saveStoryPackageToDisk).not.toHaveBeenCalled();
		expect(applySaveStarted).not.toHaveBeenCalled();
	});

	it("flush 成功且有 flushedGraph 时 PUT", async function () {
		const applySaveStarted = vi.fn();
		const applySaveSuccess = vi.fn();
		const applySaveFailure = vi.fn();
		const bundle = minimalBundle("pkg_a");
		const savedBundle = minimalBundle("pkg_a");
		saveStoryPackageToDisk.mockResolvedValue({
			bundle: savedBundle,
			validation: {
				packageId: "pkg_a",
				errors: [],
				warnings: [],
			},
		});

		await commitStoryEditorPackageSave({
			packageId: "pkg_a",
			bundle,
			flushCanvasToStore: function () {
				useStoryEditorStore.setState({
					flushedGraph: {
						nodes: [{ id: "n1" }],
						edges: [],
					},
				});
				return true;
			},
			applySaveStarted,
			applySaveSuccess,
			applySaveFailure,
		});

		expect(applySaveStarted).toHaveBeenCalled();
		expect(saveStoryPackageToDisk).toHaveBeenCalledTimes(1);
		expect(applySaveSuccess).toHaveBeenCalled();
		expect(applySaveFailure).not.toHaveBeenCalled();
	});
});
