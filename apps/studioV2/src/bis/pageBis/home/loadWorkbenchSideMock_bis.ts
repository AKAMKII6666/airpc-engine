/**
	* 从 ajaxProxy mock 组装工作台右侧侧栏快照。
	* 静态阶段真源仍是 mock 模块；禁止 UI 直引；日后换真接口只改本文件。
	*/
import {
	MOCK_ENGINEERING_STATUS,
	MOCK_RECENT_DEBUGS,
} from "@studio-v2/src/utils/ajaxProxy/packages/mockWorkbenchData";
import type { WorkbenchSideSnapshot } from "@studio-v2/typeFiles/home/store/workbenchStoreState";

/**
	* 同步读取静态侧栏 mock。
	* 不接 Host；返回可灌 store 的投影。
	*/
export function loadWorkbenchSideMock(): WorkbenchSideSnapshot {
	return {
		engineeringStatus: MOCK_ENGINEERING_STATUS,
		recentDebugs: MOCK_RECENT_DEBUGS,
	};
}
