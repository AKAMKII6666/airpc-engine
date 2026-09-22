/**
 * 模块名称：rpg-engine 包入口（统一门面）
 * 模块说明：Studio/壳只从此导入；禁止深挖内部路径。
 * 成组 export 落在 facade/，本文件只做原样 re-export（对外名字不变）。
 */

export { ENGINE_PACKAGE_NAME, getEnginePackageName } from "./packageMeta.js";

export {
	FREE_CHAPTER_ID,
	SCHEDULE_CHAPTER_ID,
	FREE_PACKAGE_ID,
	SCHEDULE_PACKAGE_ID,
	MEMORY_PROJECT_DEFAULTS,
	MEMORY_SEARCH_DEFAULTS,
	MEMORY_ROLLUP_DEFAULTS,
} from "./constants.js";

export * from "./facade/hostScheduleExports.js";
export * from "./facade/promptPackExports.js";
export * from "./facade/schemaToolExports.js";
