/**
	* 统一内容 ID 工厂：种类前缀 + UUID（无连字符），禁止递增序号。
	* 主流程禁止用户手填 / Date.now / seq 拼 ID。
	*/

/** 可生成内部 ID 的实体种类；影响前缀，便于日志识别 */
export type StudioIdKind =
	| "package"
	| "card"
	| "exit"
	| "effect"
	| "agent"
	| "asset"
	| "user"
	| "fact"
	| "intent"
	| "scene"
	| "variant";

const PREFIX: Record<StudioIdKind, string> = {
	package: "pkg",
	card: "card",
	exit: "exit",
	effect: "fx",
	agent: "agent",
	asset: "asset",
	user: "user",
	fact: "fact",
	intent: "intent",
	scene: "scene",
	variant: "var",
};

/**
	* 生成无连字符 UUID 体（32 位 hex）；浏览器 / Node 均可用 crypto.randomUUID。
	*/
export function newStudioUuidBody(): string {
	const raw =
		typeof globalThis.crypto !== "undefined" &&
		typeof globalThis.crypto.randomUUID === "function"
			? globalThis.crypto.randomUUID()
			: fallbackUuid();
	return raw.replace(/-/g, "").toLowerCase();
}

/** 极旧环境降级；勿作常态路径 */
function fallbackUuid(): string {
	const bytes = new Uint8Array(16);
	if (
		typeof globalThis.crypto !== "undefined" &&
		typeof globalThis.crypto.getRandomValues === "function"
	) {
		globalThis.crypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < 16; i += 1) {
			bytes[i] = Math.floor(Math.random() * 256);
		}
	}
	bytes[6] = (bytes[6]! & 0x0f) | 0x40;
	bytes[8] = (bytes[8]! & 0x3f) | 0x80;
	const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
		"",
	);
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
	* 生成系统内部 ID：`<prefix>_<uuid32>`（无连字符，满足包/角色/资源 id 字符集）。
	* @param kind 实体种类；影响前缀
	* @param _seed 已废弃；保留签名以免调用方大面积改签名，不参与生成
	*/
export function createStudioId(kind: StudioIdKind, _seed?: string): string {
	return `${PREFIX[kind]}_${newStudioUuidBody()}`;
}

/**
	* @deprecated 序号已废除；保留空实现以免旧测试 import 断裂。
	*/
export function resetStudioIdSeq(_next = 0): void {
	/* no-op：ID 已改为 UUID */
}
