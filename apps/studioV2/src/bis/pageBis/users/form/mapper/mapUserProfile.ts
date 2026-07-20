/**
	* 引擎 User ↔ 玩家配置页投影；落盘前后投影一致，不做年龄↔生日交叉。
	*/
import type { User } from "@airpc/rpg-engine";
import type {
	UserGender,
	UserProfileSummary,
} from "@studio-v2/typeFiles/library/users/userProfileSummary";

/**
	* 将引擎 User 投影为列表/详情用的 UserProfileSummary。
	* 磁盘 optional 字段在编辑态用空串 / 默认性别填充，避免表单缺键。
	*/
export function userToSummary(user: User): UserProfileSummary {
	const gender: UserGender =
		user.gender === "female" || user.gender === "male"
			? user.gender
			: "male";
	return {
		userId: user.userId,
		nickname: user.nickname,
		fullName: user.fullName ?? "",
		gender,
		birthday: user.birthday ?? "",
		age: typeof user.age === "number" ? user.age : 0,
		outboundWindow: {
			from:
				typeof user.outboundWindow?.from === "number"
					? user.outboundWindow.from
					: 9,
			to:
				typeof user.outboundWindow?.to === "number"
					? user.outboundWindow.to
					: 22,
		},
		location: {
			country: user.location?.country ?? "",
			province: user.location?.province ?? "",
			city: user.location?.city ?? "",
			district: user.location?.district ?? "",
		},
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	};
}

/**
	* 将页面投影还原为可写盘的引擎 User（含 location.district）。
	*/
export function summaryToUser(summary: UserProfileSummary): User {
	return {
		userId: summary.userId,
		nickname: summary.nickname,
		fullName: summary.fullName,
		gender: summary.gender,
		birthday: summary.birthday,
		age: summary.age,
		outboundWindow: {
			from: summary.outboundWindow.from,
			to: summary.outboundWindow.to,
		},
		location: {
			country: summary.location.country,
			province: summary.location.province,
			city: summary.location.city,
			district: summary.location.district,
		},
		createdAt: summary.createdAt,
		updatedAt: summary.updatedAt,
	};
}
