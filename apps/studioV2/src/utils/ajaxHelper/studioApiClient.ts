/**
	* Studio V2 客户端 API 响应解析（ajaxHelper）。
	* 统一 { ok:true, data } / { ok:false, code, message }；禁止页面裸拼错误分支。
	*/

export type StudioApiFail = {
	ok: false;
	code: string;
	message: string;
	details?: unknown;
};

export type StudioApiOk<T> = {
	ok: true;
	data: T;
};

export type StudioApiEnvelope<T> = StudioApiOk<T> | StudioApiFail;

/**
	* 解析 fetch Response；非 JSON 或业务失败时抛 Error（message 为人话）。
	*/
export async function parseStudioApiJson<T>(
	res: Response,
): Promise<T> {
	let body: unknown;
	try {
		body = await res.json();
	} catch {
		throw new Error(`请求失败（HTTP ${res.status}），响应非 JSON`);
	}
	if (
		typeof body !== "object" ||
		body === null ||
		!("ok" in body)
	) {
		throw new Error(`请求失败（HTTP ${res.status}），响应格式无效`);
	}
	const envelope = body as StudioApiEnvelope<T>;
	if (envelope.ok === true) {
		return envelope.data;
	}
	const message =
		typeof envelope.message === "string" && envelope.message.trim() !== ""
			? envelope.message
			: `请求失败（${envelope.code ?? res.status}）`;
	throw new Error(message);
}
