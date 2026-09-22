/**
	* 调试器挂机后 PostCallJob 浏览器投影类型。
	*/
/**
	* 挂机后后台 PostCallJob 的浏览器投影；用于 tip / 轮询占线与失败重试。
	* 真源在 Host 内存 + postCallJob Port；client 只读。
	*/
export type DebuggerPostCallJobView = {
	/** Host job id；retry / 轮询主键 */
	jobId: string;
	/** 所属调试用户 */
	userId: string;
	/** 已结束的 CallSession id */
	sessionId: string;
	/** 占线主 NPC agentId；与拨号互斥判定对齐 */
	primaryAgentId: string;
	/** job 状态串；如 pending / running / done / failed */
	status: string;
	/** 最近更新 ISO 时间 */
	updatedAt: string;
	/** Effect plan 终态；尚无 plan 时为 null */
	effectPlanStatus: string | null;
	/** 命中出口 id；无出口时为 null */
	selectedExitId: string | null;
	/** 分步进度；id 为步骤名，status 为运行态 */
	steps: Array<{
		id: string;
		status: "pending" | "running" | "done" | "failed" | "skipped";
		detail?: string;
	}>;
	/** 已失败步骤摘要；供 tip 展示与 retry 定位 */
	failedSteps: Array<{ stepId: string; error: string }>;
};

/** GET post-call jobs 列表响应；jobs 按 updatedAt 近到远由 server 决定 */
export type DebuggerPostCallJobsResponse = {
	/** 当前用户可见的 PostCallJob 投影列表 */
	jobs: DebuggerPostCallJobView[];
};

/** POST 重试失败 PostCallJob 的请求体 */
export type DebuggerPostCallRetryBody = {
	/** 要重试的 Host jobId */
	jobId: string;
};

/** POST 重试成功体；回读最新 job 投影 */
export type DebuggerPostCallRetryResponse = {
	/** 重试后的 job 投影；可能仍为 running */
	job: DebuggerPostCallJobView;
};

