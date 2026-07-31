/**
	* 模块名称：本机 Fs ContentPort
	* 模块说明：自 packages/rpg-engine loadWorkspace fs 扫描迁出；
	* 路径仅本模块知道（storis-packages / characters / assets）。
	* Server 边界：仅 Host 装配 / API / *.server.ts 可引用；禁止 Client。
	* 协议：技术设计 23 §4.3。
	*/
import type { ContentPort } from "@airpc/rpg-engine";
import { loadWorkspaceSnapshotFromFs } from "../snapshot/workspaceSnapshot";
import {
	assetMetaExistsFromFs,
	assetUriExistsFromFs,
	loadPackageForValidateFromFs,
	readAssetMetaFromFs,
	readCardFromFs,
	readChapterConfFromFs,
} from "../reads/contentReads";

export function createFsContentPort(): ContentPort {
	return {
		loadWorkspaceSnapshot(input) {
			return loadWorkspaceSnapshotFromFs(input.workspaceKey);
		},
		readCard(input) {
			return readCardFromFs(input);
		},
		readChapterConf(input) {
			return readChapterConfFromFs(input);
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
