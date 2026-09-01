/**
 * beginCall soft：熟人辨认块（凭 Profile.user.nickname；无则不注入）。
 * 与 opening.situation「接听瞬间未知来电」并存：对方开口后再认出。
 */

/** 已知名时注入；空/空白 nickname 返回 null。 */
export function buildAcquaintanceSoftExtra(
	knownNickname: string | undefined | null,
): string | null {
	const name = typeof knownNickname === "string" ? knownNickname.trim() : "";
	if (!name) return null;
	return [
		"[acquaintance]",
		`# 熟人辨认（已认识「${name}」）`,
		"接听瞬间仍可当陌生来电（无来电显示）；开场第一句不要先叫名字、不要说「是你呀」。",
		`对方开口后（自报、习惯口吻或明显是本人）：应辨认出是「${name}」，可自然接「哦是你啊」「嗯，咋啦」；不要假装完全不认识。`,
		`禁止再演初次记名（不要说「好，我记住啦」「我记下了，你叫${name}」这类剧本）。`,
		"旧事、约定、惯性从此刻起可自然提起；也可以多聊一两句后才「哦对，上次……」。",
	].join("\n");
}
