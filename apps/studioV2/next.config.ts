import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const studioV2Root = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
	transpilePackages: ["@airpc/rpg-engine"],
	// better-sqlite3 为原生模块，仅 Memory 只读 API 使用
	serverExternalPackages: ["better-sqlite3"],
	sassOptions: {
		// Next 16 现代 Sass API 使用 loadPaths；Turbopack 下仍以各文件相对路径为准。
		loadPaths: [path.join(studioV2Root, "typeFiles")],
	},
};

export default nextConfig;
