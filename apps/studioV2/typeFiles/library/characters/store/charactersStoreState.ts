/**
	* 角色库 domain store 契约（FE）。
	* 非 CharacterDef / Memory 真源；shell 灌列表；UI 经 feature bis 读。
	*/
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import type { MemoryListItemDto } from "@studio-v2/typeFiles/library/characters/memory/memoryReadModel";
import type { DiskUserSummaryDto } from "@studio-v2/typeFiles/library/users/diskUserSummary";
import type { ScheduledIntent } from "@studio-v2/typeFiles/library/schedule/engineScheduledIntent";

/** shell 拉列表成功后一次灌入的载荷 */
export type CharactersLoadOkPayload = {
	/** 判别成功 */
	ok: true;
	/** 列表投影；空数组表示库空 */
	characters: readonly CharacterSummary[];
};

/** 拉列表失败；message 已人话化 */
export type CharactersLoadFailPayload = {
	/** 判别失败 */
	ok: false;
	/** 人话错误；空串不应出现 */
	message: string;
};

/**
	* 列表加载结果联合；shell 一次灌入，store 只消费结果。
	* 成功与失败互斥；禁止把 xhr 细节塞进本契约。
	*/
export type CharactersLoadResult =
	| CharactersLoadOkPayload
	| CharactersLoadFailPayload;

/** 记忆区调试用户列表加载结果 */
export type CharactersPanelUsersLoadResult =
	| {
			/** 判别成功 */
			ok: true;
			/** data/users 摘要；可空 */
			users: readonly DiskUserSummaryDto[];
		}
	| {
			/** 判别失败 */
			ok: false;
			/** 人话错误 */
			message: string;
		};

/** 记忆分页加载结果；绑定当前 agentId×userId */
export type CharactersMemoryLoadResult =
	| {
			/** 判别成功 */
			ok: true;
			/** 本页条目 */
			items: readonly MemoryListItemDto[];
			/** 总条数 */
			total: number;
			/** 1-based 页码 */
			page: number;
		}
	| {
			/** 判别失败 */
			ok: false;
			/** 人话错误 */
			message: string;
		};

/** 日程列表加载结果；绑定当前 agentId×userId */
export type CharactersScheduleLoadResult =
	| {
			/** 判别成功 */
			ok: true;
			/** 意图列表 */
			intents: readonly ScheduledIntent[];
			/** Profile.schedule.clockMs */
			clockMs: number;
		}
	| {
			/** 判别失败 */
			ok: false;
			/** 人话错误 */
			message: string;
		};
