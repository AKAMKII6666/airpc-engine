/**
	* 从 ajaxProxy mock 组装调试器叙事会话快照。
	* 静态阶段真源仍是 mock 模块；禁止 UI 直引；日后换 Host 投影只改本文件。
	*/
import {
	MOCK_DEBUG_ADVANCED,
	MOCK_DEBUG_CALL_RUN,
	MOCK_DEBUG_EFFECTS,
	MOCK_DEBUG_EXIT_HIT,
	MOCK_DEBUG_ROLE_BOARD,
	MOCK_DEBUG_SCENE,
	MOCK_DEBUG_TIMELINE,
} from "@studio-v2/src/utils/ajaxProxy/debugger/mockDebuggerData";
import type { DebuggerSessionSnapshot } from "@studio-v2/typeFiles/debugger/store/debuggerStoreState";

/**
	* 同步读取静态 mock 会话。
	* 不接 Host；返回可灌 store 的整包投影。
	*/
export function loadDebuggerSessionMock(): DebuggerSessionSnapshot {
	return {
		scene: MOCK_DEBUG_SCENE,
		callRun: MOCK_DEBUG_CALL_RUN,
		exitHit: MOCK_DEBUG_EXIT_HIT,
		effects: MOCK_DEBUG_EFFECTS,
		roleBoard: MOCK_DEBUG_ROLE_BOARD,
		timeline: MOCK_DEBUG_TIMELINE,
		advanced: MOCK_DEBUG_ADVANCED,
	};
}
