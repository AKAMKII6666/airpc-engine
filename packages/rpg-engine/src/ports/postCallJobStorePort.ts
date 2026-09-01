/**
 * 模块名称：PostCallJobStorePort（挂机后副作用 job 持久化契约）
 * 模块说明：引擎只声明契约；本机实现放 engineIOModule（JSONL/SQLite）。
 */
import type { PostCallJob, PostCallJobStatus } from "../host/types.js";

export interface PostCallJobListFilter {
	userId?: string;
	agentId?: string;
	statuses?: PostCallJobStatus[];
}

export interface PostCallJobStorePort {
	/** 创建 job；同 sessionId 必须去重（幂等）。 */
	createJob(job: PostCallJob): Promise<void>;
	/** 单调更新 job；返回更新后对象，不存在返回 null。 */
	updateJob(
		jobId: string,
		patch: Partial<PostCallJob>,
	): Promise<PostCallJob | null>;
	/** 按 id 读取。 */
	getJob(jobId: string): Promise<PostCallJob | null>;
	/** 列表查询。 */
	listJobs(filter?: PostCallJobListFilter): Promise<PostCallJob[]>;
	/** 认领 pending 任务为 running；用于恢复/并发调度。 */
	claimJob(jobId: string): Promise<PostCallJob | null>;
	/** 重启时把遗留 running 任务回收为 pending，返回被回收的 jobId。 */
	reclaimRunningJobs(): Promise<string[]>;
	close?(): void;
}
