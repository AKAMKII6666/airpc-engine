/**
	* 角色日常 ScheduleCard 列表投影（characters/schedule-cards）。
	* 非故事包剧情调度节点；供 schedule_recurring_call 下拉与角色库专用路径。
	*/
export type ScheduleCardSummary = {
	/** 调度卡 id；与磁盘文件名 / scheduleCardId 对齐 */
	cardId: string;
	/** 展示标题；缺省可回落 cardId */
	title: string;
	/** 归属角色 agentId */
	ownerAgentId: string;
};
