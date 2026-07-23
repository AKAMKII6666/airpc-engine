/**
	* 模块名称：本机 Fs ContentPort
	* 模块说明：自 packages/rpg-engine loadWorkspace fs 扫描迁出；
	* 路径仅本模块知道（storis-packages / characters / assets）。
	* Server 边界：仅 Host 装配 / API / *.server.ts 可引用；禁止 Client。
	* 协议：技术设计 23 §4.3。
	*/
import type { ContentPort } from "@airpc/rpg-engine";
// 引用了 Workspace 快照读盘，用于 loadWorkspaceSnapshot
import { loadWorkspaceSnapshotFromFs } from "./workspaceSnapshot";
// 引用了按需读卡/conf/资产/validate bundle，用于 ContentPort 其余方法
import {
	assetMetaExistsFromFs,
	assetUriExistsFromFs,
	loadPackageForValidateFromFs,
	readAssetMetaFromFs,
	readCardFromFs,
	readPackageConfFromFs,
} from "./contentReads";

/**
	* 创建本机 ContentPort（行为与迁前 Host 直读 fs 等价）。
	* 各方法以 `workspaceKey` 为 data 根；与 Host.loadWorkspace(rootDir) 对齐。
	*/
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
