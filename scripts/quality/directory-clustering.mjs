/**
 * 目录职责聚类共用逻辑：无子目录平铺、根层异责堆叠、stub 森林。
 * Studio / Engine 结构门禁共用，避免两套阈值漂移。
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * 薄入口：不计入根层堆叠计数（仍可留在目录根）。
 * @param {string} name
 */
export function isThinEntryFile(name) {
	if (name === "index.ts" || name === "index.tsx") return true;
	if (name === "types.ts" || name.endsWith(".types.ts")) return true;
	if (name === "route.ts" || name === "route.helpers.ts") return true;
	return false;
}

/**
 * 纯 re-export stub：仅 export * / export {…} from，无其它实质语句。
 * @param {string} text
 */
export function isReexportStubText(text) {
	const lines = text
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith("//") && !l.startsWith("/*") && !l.startsWith("*"));
	if (lines.length === 0) return false;
	return lines.every((l) =>
		/^export\s+\*\s+from\s+["'][^"']+["']\s*;?$/.test(l) ||
		/^export\s+\{[^}]*\}\s+from\s+["'][^"']+["']\s*;?$/.test(l) ||
		/^export\s+type\s+\*\s+from\s+["'][^"']+["']\s*;?$/.test(l) ||
		/^export\s+type\s+\{[^}]*\}\s+from\s+["'][^"']+["']\s*;?$/.test(l),
	);
}

/**
 * Studio 启发式职责组。
 * @param {string} name
 */
export function studioResponsibilityGroup(name) {
	const stem = name.replace(/\.(module\.scss|scss|ts|tsx)$/, "");
	// 同壳层组件不因 Logo/Nav/Strip/ToolBar/TopBar/Shell 等后缀拆成异责
	if (
		/Shell|Chrome|Providers|Layout|Logo|Nav|Placeholder|Strip|DesignSystem|ToolBar|TopBar|FloatingPanel|Dock/i.test(
			stem,
		)
	) {
		return "shell";
	}
	// 表单契约/适配同责
	if (/Form|adaptForm|autoForm|formatSelect/i.test(stem)) return "form";
	if (/Store$/.test(stem) || stem.endsWith(".store")) return "store";
	if (/Command/.test(stem) || stem.endsWith("Commands")) return "command";
	if (/Panel|Card|Node|Canvas|Stage|Layer|Modals/i.test(stem)) return "panel";
	if (/theme|Tokens|token/i.test(stem)) return "theme";
	if (/ajax|Api|service|Probe|Client|Config|Adapter/i.test(stem)) return "service";
	if (/Memory|UsersState|UsersError|UsersLoading|NoUsers/i.test(stem)) return "memory";
	if (/Summary|Mapper|Bootstrap|Profile|engineUser|diskUser/i.test(stem)) {
		return "dto";
	}
	if (/Controller|Bindings|Selection|Handlers|useStoryEditor/i.test(stem)) {
		return "shellhook";
	}
	const m = stem.match(/^([A-Z][a-z]+)/);
	return m ? m[1].toLowerCase() : stem.slice(0, 6).toLowerCase();
}

/**
 * Engine 启发式职责组。
 * @param {string} name
 */
export function engineResponsibilityGroup(name) {
	const stem = name.replace(/\.tsx?$/, "");
	if (/Host|Session|Resolver/i.test(stem)) return "host";
	if (/Effect|Sink|Ledger/i.test(stem)) return "effect";
	if (/Schedule|Tick|Clock|Recurring/i.test(stem)) return "schedule";
	if (/Memory|Profile|Persist/i.test(stem)) return "persist";
	if (/Valid|Schema|Package/i.test(stem)) return "validate";
	if (/Card|Call|Free/i.test(stem)) return "card";
	const m = stem.match(/^([a-z]+)/i);
	return m ? m[1].toLowerCase() : stem.slice(0, 6).toLowerCase();
}

/**
 * @typedef {{ ruleId: string, file: string, line: number, column: number, message: string, suggestion: string, severity?: "error"|"warn", current?: string|number, allowed?: string|number }} ClusterViolation
 */

/**
 * @param {object} opts
 * @param {string} opts.scanRootAbs 扫描根（Studio 为 studio 根；Engine 为 src 根）
 * @param {string} opts.repoRoot
 * @param {Set<string>} opts.excludeDirNames
 * @param {(name: string) => string} opts.responsibilityGroup
 * @param {{ noSubdir: string, rootStack: string, stubForest: string }} opts.ruleIds
 * @param {(ruleId: string, rel: string) => boolean} [opts.isAllowlisted]
 */
export async function analyzeDirectoryClusteringShared(opts) {
	/** @type {ClusterViolation[]} */
	const violations = [];
	const exclude = opts.excludeDirNames;
	const groupOf = opts.responsibilityGroup;
	const ids = opts.ruleIds;
	const allow = opts.isAllowlisted ?? (() => false);

	const walk = async (dir) => {
		let entries;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		const codeFiles = entries
			.filter(
				(e) =>
					e.isFile() &&
					/\.(ts|tsx)$/.test(e.name) &&
					!e.name.endsWith(".d.ts"),
			)
			.map((e) => e.name);
		const subdirs = entries.filter(
			(e) => e.isDirectory() && !exclude.has(e.name),
		);
		const rel = path.relative(opts.repoRoot, dir).split(path.sep).join("/");

		const stackFiles = codeFiles.filter((n) => !isThinEntryFile(n));
		const stackGroups = new Set(stackFiles.map(groupOf));
		const allGroups = new Set(codeFiles.map(groupOf));

		// 008 / 009：无子目录异责平铺（历史口径：计入全部源文件）
		if (codeFiles.length >= 4 && subdirs.length === 0 && allGroups.size >= 2) {
			if (!allow(ids.noSubdir, rel)) {
				violations.push({
					ruleId: ids.noSubdir,
					file: rel,
					line: 1,
					column: 1,
					severity: "error",
					current: codeFiles.length,
					allowed: "clustered-dirs",
					message: `目录含 ${codeFiles.length} 个源文件且职责组≥2（${[...allGroups].join(",")}），应分子目录`,
					suggestion:
						"按职责拆分子目录，禁止长前缀代目录；新增文件勿继续恶化平铺",
				});
			}
		}

		// 025 / 010：根层异责堆叠（有子目录仍堆；薄入口不计入）
		if (
			subdirs.length > 0 &&
			stackFiles.length >= 4 &&
			stackGroups.size >= 2
		) {
			if (!allow(ids.rootStack, rel)) {
				violations.push({
					ruleId: ids.rootStack,
					file: rel,
					line: 1,
					column: 1,
					severity: "error",
					current: stackFiles.length,
					allowed: "root-thin-or-clustered",
					message: `根层仍堆 ${stackFiles.length} 个非薄入口源文件且职责组≥2（${[...stackGroups].join(",")}），应收入子目录`,
					suggestion:
						"有子目录时根上只留薄入口；其余实体进职责子目录，禁止根层继续异责平铺",
				});
			}
		}

		// 026 / 011：stub 森林
		if (codeFiles.length >= 4) {
			const stubFlags = await Promise.all(
				codeFiles.map(async (name) => {
					const text = await readFile(path.join(dir, name), "utf8");
					return isReexportStubText(text);
				}),
			);
			const stubCount = stubFlags.filter(Boolean).length;
			if (stubCount >= 4) {
				if (!allow(ids.stubForest, rel)) {
					violations.push({
						ruleId: ids.stubForest,
						file: rel,
						line: 1,
						column: 1,
						severity: "error",
						current: stubCount,
						allowed: "no-stub-forest",
						message: `目录含 ${stubCount} 个纯 re-export stub，形成 stub 森林`,
						suggestion:
							"删除根 stub，调用方改真实子路径；仅包门面 index 允许聚合导出",
					});
				}
			}
		}

		for (const d of subdirs) {
			await walk(path.join(dir, d.name));
		}
	};

	await walk(opts.scanRootAbs);
	return violations;
}
