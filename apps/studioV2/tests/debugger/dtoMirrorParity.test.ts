/**
	* Server↔Client 调试 DTO 镜像防漂移：重叠类型字段必须一致。
	* Client 真源 = typeFiles/debugger/{postCall,memoryTrace}；
	* Server 镜像 = utils/server/debugger/session/debuggerCallDtos.server.ts。
	*/
import { describe, expect, it } from "vitest";
import type {
	DebuggerMemoryAttitudeView as ClientAttitude,
	DebuggerMemoryCommitTraceDetailView as ClientDetail,
	DebuggerMemoryTraceBlockView as ClientBlock,
} from "@studio-v2/typeFiles/debugger/memoryTrace";
import type { DebuggerPostCallJobView as ClientJob } from "@studio-v2/typeFiles/debugger/postCall";
import type {
	DebuggerMemoryAttitudeView as ServerAttitude,
	DebuggerMemoryCommitTraceDetailView as ServerDetail,
	DebuggerMemoryTraceBlockView as ServerBlock,
	DebuggerPostCallJobView as ServerJob,
} from "@studio-v2/src/utils/server/debugger/session/debuggerCallDtos.server";

/** 编译期：A 可赋给 B 且 B 可赋给 A → 结构等价 */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

function assertExact<_T extends true>(): void {
	/* 仅类型占位 */
}

describe("debugger DTO server/client mirror parity", () => {
	it("overlapping view types are structurally identical", () => {
		assertExact<Exact<ClientJob, ServerJob>>();
		assertExact<Exact<ClientBlock, ServerBlock>>();
		assertExact<Exact<ClientAttitude, ServerAttitude>>();
		assertExact<Exact<ClientDetail, ServerDetail>>();
		// 运行时保活：若类型断言被擦除，仍有显式期望
		expect(true).toBe(true);
	});
});
