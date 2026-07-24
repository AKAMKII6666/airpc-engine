/**
	* 角色定时外呼列表：经 ajaxProxy 按 userId×agentId 拉 intents。
	* UI hook 不得直引 scheduleApi。
	*/
import {
	fetchAgentSchedule,
	type ScheduleListDto,
} from "@studio-v2/src/utils/ajaxProxy/library/api/scheduleApi";

/**
	* 拉取某玩家×角色的 schedule 页；失败抛错由调用方记 error。
	*/
export async function loadAgentSchedule(input: {
	userId: string;
	agentId: string;
}): Promise<ScheduleListDto> {
	return fetchAgentSchedule(input);
}
