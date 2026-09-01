/**
 * 测试用：复制 data/ 树时跳过 debug-dto、logs 与临时文件（降低 it 回调圈复杂度）。
 */
import { cp } from "node:fs/promises";
import path from "node:path";

/**
 * 供 `fs.cp` 使用的 filter：排除 data 根下 debug-dto / logs 目录及文件名含 `.tmp` 的项。
 */
export function createDataCopyFilter(dataSrc: string): (src: string) => boolean {
	return function dataCopyFilter(src: string): boolean {
		const rel = path.relative(dataSrc, src);
		const base = path.basename(src);
		return (
			rel !== "debug-dto" &&
			!rel.startsWith("debug-dto" + path.sep) &&
			rel !== "logs" &&
			!rel.startsWith("logs" + path.sep) &&
			!base.includes(".tmp")
		);
	};
}

/** 递归复制 data 树到目标目录，应用 {@link createDataCopyFilter}。 */
export async function copyDataTree(dataSrc: string, dataRoot: string): Promise<void> {
	await cp(dataSrc, dataRoot, {
		recursive: true,
		filter: createDataCopyFilter(dataSrc),
	});
}
