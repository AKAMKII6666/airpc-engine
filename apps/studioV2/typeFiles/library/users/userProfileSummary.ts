/**
	* 玩家配置页投影（对齐引擎 User 身份字段）。
	* 本页不展示 Board / stories / 调试偏好等经历态。
	*/

/** 玩家性别；与引擎 User.gender 对齐，本轮 UI 仅两档 */
export type UserGender = "male" | "female";

/** 地理位置四结构化字段；「地理位置」仅为分组标题，非自由文本 */
export type UserLocationSummary = {
	/** 国家 → user.location.country；可空串，属玩家档案随 Profile 持久化 */
	country: string;
	/** 省/州 → user.location.province；可空串，属玩家档案随 Profile 持久化 */
	province: string;
	/** 城市 → user.location.city；可空串，属玩家档案随 Profile 持久化 */
	city: string;
	/** 区/县 → user.location.district；可空串，属玩家档案随 Profile 持久化 */
	district: string;
};

/** 玩家档案列表/详情投影；字段名对齐引擎 User */
export type UserProfileSummary = {
	/** 系统生成 userId；主流程不手填，仅高级区只读 */
	userId: string;
	/** 昵称 → user.nickname */
	nickname: string;
	/** 全名 → user.fullName */
	fullName: string;
	/** 性别 → user.gender */
	gender: UserGender;
	/** 生日 YYYY-MM-DD → user.birthday；与 age 各填各的 */
	birthday: string;
	/** 年龄整数 → user.age；与 birthday 各填各的 */
	age: number;
	/** NPC 可外呼本地小时窗 → user.outboundWindow（半开）；编辑态必填，默认 9–22 */
	outboundWindow: {
		from: number;
		to: number;
	};
	/** 国家/省/市/区 → user.location */
	location: UserLocationSummary;
	/** 创建时间 ISO；只读，系统写入 */
	createdAt: string;
	/** 更新时间 ISO；只读，系统写入 */
	updatedAt: string;
};
