/**
	* 与引擎同构镜像，不以 import 同步。
	* 对齐 packages/rpg-engine/src/schema/profile.ts 的 UserSchema。
	*/

/** 对齐引擎 UserSchema；薄用户档案 */
export type User = {
	/** 用户稳定键 */
	userId: string;
	/** 昵称；必填 */
	nickname: string;
	/** 全名；缺省表示未填 */
	fullName?: string;
	/** 玩家性别；磁盘可选，Studio 编辑态全必填 */
	gender?: "male" | "female";
	/** 生日 YYYY-MM-DD；与 age 各填各的，不做交叉校验 */
	birthday?: string;
	/** 年龄整数；与 birthday 各填各的，不做推算校验 */
	age?: number;
	/**
		* NPC 可外呼本地小时窗（半开：h >= from && h < to）。
		* 窗外 scheduleTick defer；与 promptScenes.localHourRange 无关。
		*/
	outboundWindow?: {
		from: number;
		to: number;
	};
	/** 常驻地；缺省表示未填 */
	location?: {
		country: string;
		province: string;
		city: string;
		district?: string;
	};
	/** 偏好设置；引擎 v1 不强校验内部结构 */
	preferences?: Record<string, unknown>;
	/** 创建时刻；ISO-8601 */
	createdAt: string;
	/** 最近更新时刻；ISO-8601 */
	updatedAt: string;
};
