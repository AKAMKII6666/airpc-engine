/**
	* 引擎 User ↔ 玩家配置页投影；落盘前后投影一致，不做年龄↔生日交叉。
	*/
import type { User } from "@studio-v2/typeFiles/library/users/engine/engineUser";
import type {
	UserGender,
	UserProfileSummary,
} from "@studio-v2/typeFiles/library/users/summary/userProfileSummary";

function mapGender(raw: User["gender"]): UserGender {
	if (raw === "female" || raw === "male") return raw;
	return "male";
}

function numOr(value: unknown, fallback: number): number {
	return typeof value === "number" ? value : fallback;
}

/**
	* 将引擎 User 投影为列表/详情用的 UserProfileSummary。
	* 磁盘 optional 字段在编辑态用空串 / 默认性别填充，避免表单缺键。
	*/
export function userToSummary(user: User): UserProfileSummary {
	return {
		userId: user.userId,
		nickname: user.nickname,
		fullName: user.fullName ?? "",
		gender: mapGender(user.gender),
		birthday: user.birthday ?? "",
		age: numOr(user.age, 0),
		outboundWindow: {
			from: numOr(user.outboundWindow?.from, 9),
			to: numOr(user.outboundWindow?.to, 22),
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
