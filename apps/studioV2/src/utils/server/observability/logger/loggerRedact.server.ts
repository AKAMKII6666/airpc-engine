/**
	* Studio V2 server 日志脱敏与裁剪。
	* pino 写盘前的最后防线：API key / token / Authorization 不得落盘。
	*/

const SENSITIVE_KEY_RE =
	/(api[_-]?key|authorization|bearer|token|password|passwd|secret|cookie|set-cookie)/i;
const SECRET_TEXT_RE =
	/(sk-[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._~+/=-]{8,})/g;
const MAX_STRING_LENGTH = 1600;
const MAX_ARRAY_LENGTH = 40;
const MAX_DEPTH = 6;

function maskSecretText(value: string): string {
	return value.replace(SECRET_TEXT_RE, function (match) {
		if (match.startsWith("Bearer ")) return "Bearer ***";
		return match.length <= 8 ? "********" : `${match.slice(0, 4)}...${match.slice(-4)}`;
	});
}

function trimString(value: string): string {
	const masked = maskSecretText(value);
	if (masked.length <= MAX_STRING_LENGTH) return masked;
	return `${masked.slice(0, MAX_STRING_LENGTH)}...<truncated>`;
}

function redactArray(value: unknown[], depth: number): unknown[] {
	return value.slice(0, MAX_ARRAY_LENGTH).map(function (item) {
		return redactForLog(item, depth + 1);
	});
}

function redactObject(value: Record<string, unknown>, depth: number): unknown {
	const out: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(value)) {
		if (SENSITIVE_KEY_RE.test(key)) {
			out[key] = "[REDACTED]";
			continue;
		}
		out[key] = redactForLog(item, depth + 1);
	}
	return out;
}

function errorToLogObject(error: Error): Record<string, unknown> {
	return {
		name: error.name,
		message: trimString(error.message),
		stack: error.stack ? trimString(error.stack) : undefined,
	};
}

/** 递归脱敏任意日志 payload；返回值可安全 JSON 序列化 */
export function redactForLog(value: unknown, depth = 0): unknown {
	if (depth > MAX_DEPTH) return "[MaxDepth]";
	if (value instanceof Error) return errorToLogObject(value);
	if (typeof value === "string") return trimString(value);
	if (typeof value === "number" || typeof value === "boolean" || value === null) {
		return value;
	}
	if (typeof value === "bigint") return value.toString();
	if (typeof value === "undefined") return undefined;
	if (Array.isArray(value)) return redactArray(value, depth);
	if (typeof value === "object") {
		return redactObject(value as Record<string, unknown>, depth);
	}
	return String(value);
}
