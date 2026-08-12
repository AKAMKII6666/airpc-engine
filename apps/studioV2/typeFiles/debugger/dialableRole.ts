/**
	* 调试器待机角色投影 DTO。
	* 真源来自 data/characters + free-cards；浏览器只消费可拨状态。
	*/

/** 单个调试器待机角色；用于外部入口 free card 拨号 */
export type DebuggerDialableRole = {
	/** 角色 agentId；拨号命中后传给 Host free_call */
	agentId: string;
	/** UI 展示名；优先 displayName，其次 identity.nickname/fullName */
	displayName: string;
	/** 角色电话号码；来自 meta.phoneNumber/identity.phoneNumber，缺省用 agentId */
	phoneNumber: string;
	/** 是否允许外部调试器直接拨 free card */
	canFreeCall: boolean;
	/** 绑定的 free card id；没有绑定时为 null */
	freeCardId: string | null;
	/** 不可拨原因；可拨时为 null */
	blockedReason: string | null;
};

/** 调试器待机角色列表响应 */
export type DebuggerDialableRolesResponse = {
	/** 所有角色的调试拨号投影，包含不可拨原因 */
	roles: DebuggerDialableRole[];
};
