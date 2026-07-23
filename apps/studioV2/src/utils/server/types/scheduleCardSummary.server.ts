/**
	* 角色日常 ScheduleCard 列表投影（Server 侧副本；与 typeFiles 同构，不以 import 同步）。
	*/
export type ScheduleCardSummary = {
	/** 调度卡 id；与磁盘文件名 / scheduleCardId 对齐 */
	cardId: string;
	/** 展示标题；缺省可回落 cardId */
	title: string;
	/** 归属角色 agentId */
	ownerAgentId: string;
};
