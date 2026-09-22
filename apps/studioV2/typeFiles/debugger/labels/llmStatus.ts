/**
	* 调试器大模型公开状态 DTO。
	* 浏览器只能拿到脱敏状态；API Key 永远留在 server 环境。
	*/

/** 调试器首批支持的文本模型供应商枚举 */
export type DebuggerLlmProvider = "qwen" | "openai_compatible";

/** 调试器可展示的大模型配置状态；不包含原始 API Key */
export type DebuggerLlmPublicStatus = {
	/** 是否允许调试器尝试调用文本模型；false 时即使有 key 也不消费 */
	enabled: boolean;
	/** 是否允许调试器向模型发送 function calling tools */
	toolsEnabled: boolean;
	/** 是否具备发起模型请求所需的最小配置 */
	configured: boolean;
	/** 模型供应商；千问走 OpenAI-compatible 协议 */
	provider: DebuggerLlmProvider;
	/** 实际消费的模型名；未配置时仍返回默认建议值 */
	model: string;
	/** OpenAI-compatible base URL；不含 API Key */
	baseUrl: string;
	/** API Key 脱敏展示；未配置为 null */
	maskedApiKey: string | null;
	/** 缺失项名；用于设置页或调试器提示 */
	missing: string[];
	/** 给 UI 展示的人话摘要 */
	message: string;
};
