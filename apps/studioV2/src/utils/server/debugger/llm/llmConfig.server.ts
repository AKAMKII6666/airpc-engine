/**
	* 调试器文本 LLM 配置解析。
	* 只在 server 使用；API Key 不得进入 Client DTO。
	*/

export type ServerLlmProvider = "qwen" | "openai_compatible";

export type ServerLlmRuntimeConfig = {
	/** false 时调试器不可消费模型，即使 apiKey 存在 */
	enabled: boolean;
	/** false 时禁止发送 tools；用于模型不支持 FC 时显式降级 */
	toolsEnabled: boolean;
	/** 当前供应商；qwen 默认走百炼 OpenAI-compatible endpoint */
	provider: ServerLlmProvider;
	/** OpenAI-compatible base URL；不包含鉴权信息 */
	baseUrl: string;
	/** 模型名，例如 qwen3.5-flash */
	model: string;
	/** 仅 server 消费的密钥；禁止透出给浏览器 */
	apiKey: string | null;
	/** key 来源环境变量；便于调试，不含值 */
	keySource: "AIRPC_LLM_API_KEY" | "none";
	/** 缺失的必要项 */
	missing: string[];
};

export type ServerLlmPublicStatus = {
	enabled: boolean;
	toolsEnabled: boolean;
	configured: boolean;
	provider: ServerLlmProvider;
	model: string;
	baseUrl: string;
	maskedApiKey: string | null;
	missing: string[];
	message: string;
};

type LlmEnv = Record<string, string | undefined>;

const DEFAULT_QWEN_BASE_URL =
	"https://dashscope.aliyuncs.com/compatible-mode/v1";
const DEFAULT_QWEN_MODEL = "qwen3.5-flash";

function trimEnv(
	env: LlmEnv,
	key: string,
): string | undefined {
	const value = env[key];
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function parseEnabled(value: string | undefined): boolean {
	if (!value) return true;
	const normalized = value.trim().toLowerCase();
	return !["0", "false", "off", "no", "disabled"].includes(normalized);
}

function parseProvider(value: string | undefined): ServerLlmProvider {
	if (value === "openai_compatible") return "openai_compatible";
	return "qwen";
}

export function maskApiKey(apiKey: string | null): string | null {
	if (!apiKey) return null;
	if (apiKey.length <= 8) return "********";
	return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

export function resolveServerLlmRuntimeConfig(
	env: LlmEnv = process.env,
): ServerLlmRuntimeConfig {
	const provider = parseProvider(trimEnv(env, "AIRPC_LLM_PROVIDER"));
	const apiKey = trimEnv(env, "AIRPC_LLM_API_KEY") ?? null;
	const enabled = parseEnabled(trimEnv(env, "AIRPC_LLM_ENABLED"));
	const toolsEnabled = parseEnabled(trimEnv(env, "AIRPC_LLM_TOOLS_ENABLED"));
	const baseUrl =
		trimEnv(env, "AIRPC_LLM_BASE_URL") ?? DEFAULT_QWEN_BASE_URL;
	const model = trimEnv(env, "AIRPC_LLM_MODEL") ?? DEFAULT_QWEN_MODEL;
	const missing: string[] = [];
	if (enabled && !apiKey) missing.push("AIRPC_LLM_API_KEY");
	if (enabled && !baseUrl) missing.push("AIRPC_LLM_BASE_URL");
	if (enabled && !model) missing.push("AIRPC_LLM_MODEL");

	return {
		enabled,
		toolsEnabled,
		provider,
		baseUrl,
		model,
		apiKey,
		keySource: apiKey ? "AIRPC_LLM_API_KEY" : "none",
		missing,
	};
}

export function toServerLlmPublicStatus(
	config: ServerLlmRuntimeConfig,
): ServerLlmPublicStatus {
	const configured = config.enabled && config.missing.length === 0;
	const message = !config.enabled
		? "大模型调用已关闭"
		: configured
			? `已配置 ${config.model}`
			: `未配置：${config.missing.join(", ")}`;
	return {
		enabled: config.enabled,
		toolsEnabled: config.toolsEnabled,
		configured,
		provider: config.provider,
		model: config.model,
		baseUrl: config.baseUrl,
		maskedApiKey: maskApiKey(config.apiKey),
		missing: [...config.missing],
		message,
	};
}

export function getServerLlmPublicStatus(): ServerLlmPublicStatus {
	return toServerLlmPublicStatus(resolveServerLlmRuntimeConfig());
}
