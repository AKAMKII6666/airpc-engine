/**
	* 记忆区调试用户摘要：经 ajaxProxy 拉 data/users 投影；不走 mock。
	* UI hook 不得直引 usersApi。
	*/
import { fetchDiskUserSummaries } from "@studio-v2/src/utils/ajaxProxy/library/api/usersApi";
import type { DiskUserSummaryDto } from "@studio-v2/typeFiles/library/users/diskUserSummary";

/**
	* 拉取调试用户摘要列表；失败抛错由调用方记 usersError。
	*/
export async function loadCharacterMemoryUsers(): Promise<
	DiskUserSummaryDto[]
> {
	return fetchDiskUserSummaries();
}
