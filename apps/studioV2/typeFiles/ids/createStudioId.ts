/**
	* 统一内容 ID 工厂。
	* 主流程禁止用户手填 / Date.now().toString(36) 拼 ID；此处集中生成稳定 snake_case id。
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
	| "intent";

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
};

let seq = 0;

/**
	* 生成系统内部 ID（英文 snake_case）。
	* @param kind 实体种类；影响前缀，便于日志与高级视图识别
	* @param seed 可选人类可读片段；会规范化为 [a-z0-9_]，空则用递增序号
	*/
export function createStudioId(kind: StudioIdKind, seed?: string): string {
	seq += 1;
	const normalized = (seed ?? "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 32);
	const tail = normalized.length > 0 ? normalized : String(seq);
	return `${PREFIX[kind]}_${tail}_${seq.toString(36)}`;
}

/** 测试或冷启动时可重置序号，避免夹具互相串号。 */
export function resetStudioIdSeq(next = 0): void {
	seq = next;
}
