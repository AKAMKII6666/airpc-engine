/**
	* Lore LLM bootstrap（Studio V2 Next server）。
	* 复用 utils/server/llm 配置与 client；失败由 Host 降级 fallback。
	*/
import {
	WorldLoreDocSchema,
	type LoreBootstrapInput,
	type LoreBootstrapPort,
	type WorldLoreDoc,
} from "@airpc/rpg-engine";
import {
	ServerLlmError,
	runServerLlmChat,
} from "@studio-v2/src/utils/server/llm/llmClient.server";
import {
	resolveLoreLlmRuntimeConfig,
	type ServerLlmRuntimeConfig,
} from "@studio-v2/src/utils/server/llm/llmConfig.server";

/** 供单测：拼 LLM user prompt。 */
export function buildLoreBootstrapPrompt(input: LoreBootstrapInput): string {
	const loc = input.user.location;
	const place = loc
		? [loc.country, loc.province, loc.city, loc.district]
				.filter(Boolean)
				.join("·")
		: "未知地点";
	const chars = input.characters.map(function (ch) {
		return {
			agentId: ch.agentId,
			displayName: ch.displayName ?? ch.agentId,
		};
	});
	return [
		"你是 AI-RPG 世界背景生成器。只输出一个 JSON 对象，不要 markdown。",
		"字段：sharedPremise(string)、perspectives(Record<agentId,string[]>)、characters(Record<agentId,{displayName,blurb}>)。",
		"要求：日常电话感；勿剧透未解锁内容；勿编造未提供的地域细节。",
		`地点：${place}`,
		`角色：${JSON.stringify(chars)}`,
		`generatedAt 请使用：${input.nowIso}`,
	].join("\n");
}

/** 供单测：从模型文本取出 JSON 对象。 */
export function extractLoreJsonObject(text: string): unknown {
	const trimmed = text.trim();
	const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const raw = fence ? fence[1].trim() : trimmed;
	return JSON.parse(raw) as unknown;
}

/**
	* 将 LLM JSON 根对象校验为 WorldLoreDoc；location 以 user 为准。
	*/
export function parseWorldLoreFromLlmJson(
	parsed: unknown,
	input: LoreBootstrapInput,
): WorldLoreDoc {
	if (!parsed || typeof parsed !== "object") {
		throw new Error("lore LLM JSON root must be object");
	}
	const candidate = parsed as Record<string, unknown>;
	return WorldLoreDocSchema.parse({
		version: 1,
		source: "llm",
		generatedAt:
			typeof candidate.generatedAt === "string"
				? candidate.generatedAt
				: input.nowIso,
		location: input.user.location,
		sharedPremise: candidate.sharedPremise,
		perspectives: candidate.perspectives ?? {},
		characters: candidate.characters,
	});
}

function isLoreLlmUsable(config: ServerLlmRuntimeConfig): boolean {
	return config.enabled && config.missing.length === 0 && config.apiKey !== null;
}

/**
	* 装配 LoreBootstrapPort；配置不可用（无 Key / 关闭）时返回 null。
	*/
export function createLlmLoreBootstrapPort(
	config: ServerLlmRuntimeConfig = resolveLoreLlmRuntimeConfig(),
): LoreBootstrapPort | null {
	if (!isLoreLlmUsable(config)) {
		return null;
	}

	return {
		async generate(input: LoreBootstrapInput): Promise<WorldLoreDoc> {
			try {
				const result = await runServerLlmChat(
					{
						messages: [
							{
								role: "system",
								content:
									"Return only valid JSON for WorldLoreDoc body fields.",
							},
							{
								role: "user",
								content: buildLoreBootstrapPrompt(input),
							},
						],
						temperature: 0.4,
						responseFormat: "json_object",
					},
					{ config },
				);
				return parseWorldLoreFromLlmJson(
					extractLoreJsonObject(result.text),
					input,
				);
			} catch (err) {
				if (err instanceof ServerLlmError) {
					throw new Error(err.message);
				}
				throw err;
			}
		},
	};
}

/** 从 process.env 构建；无 Key／关闭时返回 null。 */
export function createLlmLoreBootstrapPortFromEnv(): LoreBootstrapPort | null {
	return createLlmLoreBootstrapPort(resolveLoreLlmRuntimeConfig());
}
