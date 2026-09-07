/**
	* 动态加载插件 entry 模块；支持 default / contribute(api) / create(api)。
	* entry 必须 realpath 后仍落在包根内（禁止 ../ 与 symlink 逃逸）。
	*/
import path from "node:path";
import { realpath } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { PluginCapabilityApi } from "@airpc/pack-sdk";

export type LoadedPluginModule = {
	raw: unknown;
	contribution: unknown;
};

function isInsideRoot(rootReal: string, entryReal: string): boolean {
	const rel = path.relative(rootReal, entryReal);
	return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
	* 校验 absoluteEntryPath（经 realpath）仍位于 packageRoot 下。
	*/
export async function assertEntryInsidePackageRoot(input: {
	packageRoot: string;
	absoluteEntryPath: string;
}): Promise<void> {
	const rootReal = await realpath(input.packageRoot);
	let entryReal: string;
	try {
		entryReal = await realpath(input.absoluteEntryPath);
	} catch {
		// 文件尚未存在时退回 resolve 校验（加载 import 仍会失败）
		entryReal = path.resolve(input.absoluteEntryPath);
		const rootResolved = path.resolve(input.packageRoot);
		if (!isInsideRoot(rootResolved, entryReal)) {
			throw new Error(
				`entry_outside_package_root:${path.relative(rootResolved, entryReal)}`,
			);
		}
		return;
	}
	if (!isInsideRoot(rootReal, entryReal)) {
		throw new Error(
			`entry_outside_package_root:${path.relative(rootReal, entryReal)}`,
		);
	}
}

/**
	* 解析 entry 相对包根的绝对路径后动态 import。
	*/
export async function loadPluginEntryModule(input: {
	absoluteEntryPath: string;
	api: PluginCapabilityApi;
	/** 可选：传入则强制校验路径不逃逸包根 */
	packageRoot?: string;
}): Promise<LoadedPluginModule> {
	if (input.packageRoot) {
		await assertEntryInsidePackageRoot({
			packageRoot: input.packageRoot,
			absoluteEntryPath: input.absoluteEntryPath,
		});
	}
	const href = pathToFileURL(input.absoluteEntryPath).href;
	const mod = (await import(href)) as Record<string, unknown>;
	const raw = mod.default ?? mod;
	let contribution: unknown = raw;
	if (typeof raw === "function") {
		contribution = await Promise.resolve(
			(raw as (api: PluginCapabilityApi) => unknown)(input.api),
		);
	} else if (
		raw &&
		typeof raw === "object" &&
		typeof (raw as { contribute?: unknown }).contribute === "function"
	) {
		contribution = await Promise.resolve(
			(
				raw as {
					contribute: (api: PluginCapabilityApi) => unknown;
				}
			).contribute(input.api),
		);
	} else if (
		raw &&
		typeof raw === "object" &&
		typeof (raw as { create?: unknown }).create === "function"
	) {
		contribution = await Promise.resolve(
			(raw as { create: (api: PluginCapabilityApi) => unknown }).create(
				input.api,
			),
		);
	}
	return { raw, contribution };
}
