/**
 * 第一方 CapabilityPack 契约（L1）：静态 import + merge；非 workspace plugins。
 * 见技术设计 24 §4；槽点名见 slots.ts（与 25 §5 同构）。
 */
import type { BackgroundSlot, CapabilityPackDomain, RealtimeSlot } from "./slots.js";

/** 对外契约大版本；与 L2 apiVersion 对齐，冻结前勿随意抬升 */
export type CapabilityPackApiVersion = 1;

export interface FirstPartyPackManifest {
	packId: string;
	packVersion: string;
	apiVersion: CapabilityPackApiVersion;
	/** 与 L2 清单域对齐，便于日后迁出到 workspace plugins/ */
	domains: readonly CapabilityPackDomain[];
}

/**
 * 按槽点贡献表；L1-A 值为 unknown，后续分期再收窄为具体 registry/handler 类型。
 * 禁止在此契约中暴露磁盘路径或私有 Host Map。
 */
export interface FirstPartyPackContribute {
	realtime?: Partial<Record<RealtimeSlot, unknown>>;
	background?: Partial<Record<BackgroundSlot, unknown>>;
}

export interface FirstPartyPack {
	manifest: FirstPartyPackManifest;
	contribute: FirstPartyPackContribute;
}
