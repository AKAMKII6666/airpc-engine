/**
 * 模块名称：测试用 Fs ContentPort
 * 模块说明：与 engineIOModule/content 行为对齐的测试镜像；
 * 引擎测不得 import apps/studioV2（独立性优先于 DRY）。
 */
import type { ContentPort } from "../../src/ports/contentPort.js";
// 引用了 Workspace 快照读盘，用于 loadWorkspaceSnapshot
import { loadWorkspaceSnapshotFromFs } from "./content/workspaceSnapshot.js";
// 引用了按需读卡/conf/资产/validate bundle
import {
	assetMetaExistsFromFs,
	assetUriExistsFromFs,
	loadPackageForValidateFromFs,
	readAssetMetaFromFs,
	readCardFromFs,
	readPackageConfFromFs,
} from "./content/contentReads.js";

/** 指向 workspaceKey=dataRoot 的 ContentPort；供 host 集成测注入。 */
export function createFsContentPort(): ContentPort {
	return {
		loadWorkspaceSnapshot(input) {
			return loadWorkspaceSnapshotFromFs(input.workspaceKey);
		},
		readCard(input) {
			return readCardFromFs(input);
		},
		readPackageConf(input) {
			return readPackageConfFromFs(input);
		},
		loadPackageForValidate(input) {
			return loadPackageForValidateFromFs(input);
		},
		assetMetaExists(input) {
			return assetMetaExistsFromFs(input);
		},
		readAssetMeta(input) {
			return readAssetMetaFromFs(input);
		},
		assetUriExists(input) {
			return assetUriExistsFromFs(input);
		},
	};
}
