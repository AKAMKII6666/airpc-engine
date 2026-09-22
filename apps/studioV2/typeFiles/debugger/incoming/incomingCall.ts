/**
	* 调试器外呼事件浏览器投影。
	*/
export type DebuggerIncomingCallView = {
	/** Host incoming event id；接听/挂断时回传 */
	eventId: string;
	/** 当前调试用户 id */
	userId: string;
	/** 外呼角色 id */
	agentId: string;
	/** 外呼角色展示名；server 从角色库投影 */
	displayName: string;
	/** 外呼角色号码；用于 modal 辅助展示 */
	phoneNumber: string;
	/** 外呼目标章节 id */
	chapterId: string;
	/** 外呼目标通话卡 id */
	cardId: string;
	/** Board pending instance id；用于核对接听命中的 pending */
	instanceId: string;
	/** Profile.schedule once intent id；用于日志索引 */
	scheduleIntentId: string;
	/** 事件来源；当前为 schedule */
	source: "schedule" | string;
	/** incoming event 状态；GET 只返回 pending */
	status: "pending" | "accepted" | "rejected" | "dismissed" | string;
	/** 事件创建时间 ISO 字符串 */
	createdAt: string;
};

/** 表示真实 Host CallSession 的浏览器投影，生命周期跟随 server 内存会话 */
