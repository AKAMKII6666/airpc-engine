/**
	* L2 扫描贡献表类型与空表工厂。
	*/
import type {
	AfterHangupHook,
	CommitContextEnricher,
	CommitExtractContributor,
	PromptProvider,
	ScheduleGate,
	SoftExtraEnricher,
	TaskRegistrar,
	TaskTickHandler,
} from "@airpc/rpg-engine";

export type PluginUiPanelDescriptor = {
	pluginId: string;
	slot: "settings.plugin" | "character.plugin" | "user.plugin";
	entry: string;
	/** 供 iframe：相对插件根的 UI 入口 */
	assetPath: string;
	title: string;
};

export type PluginLoadFailure = {
	pluginId?: string;
	reason: string;
	dirName?: string;
};

export type PluginLoadedInfo = {
	pluginId: string;
	version: string;
	name?: string;
	slots: string[];
	domains: Array<"realtime" | "background" | "ui">;
};

export type ScannedPluginContributions = {
	extraProviders: PromptProvider[];
	softExtraEnrichers: SoftExtraEnricher[];
	afterHangupHooks: AfterHangupHook[];
	packIdByHookId: Map<string, string>;
	scheduleGates: ScheduleGate[];
	packIdByGateId: Map<string, string>;
	taskRegistrars: TaskRegistrar[];
	packIdByTaskId: Map<string, string>;
	taskTickHandlers: TaskTickHandler[];
	/** enricherId → pluginId，供合流冲突剔除 */
	packIdByEnricherId: Map<string, string>;
	/** providerId → pluginId */
	packIdByProviderId: Map<string, string>;
	/** contributorId → pluginId */
	packIdByContributorId: Map<string, string>;
	commitContextEnrichers: CommitContextEnricher[];
	commitExtractContributors: CommitExtractContributor[];
	outboundPrepare: Array<{
		pluginId: string;
		run: (input: Record<string, unknown>) => unknown | Promise<unknown>;
	}>;
	outboundRequest: Array<{
		pluginId: string;
		run: (input: Record<string, unknown>) => unknown | Promise<unknown>;
	}>;
	uiPanels: PluginUiPanelDescriptor[];
	loaded: PluginLoadedInfo[];
	failures: PluginLoadFailure[];
	skippedDisabled: string[];
	/** 根目录扫描 IO 失败（非 ENOENT） */
	scanRootError?: string;
};

export function emptyContributions(): ScannedPluginContributions {
	return {
		extraProviders: [],
		softExtraEnrichers: [],
		afterHangupHooks: [],
		packIdByHookId: new Map(),
		scheduleGates: [],
		packIdByGateId: new Map(),
		taskRegistrars: [],
		packIdByTaskId: new Map(),
		taskTickHandlers: [],
		packIdByEnricherId: new Map(),
		packIdByProviderId: new Map(),
		packIdByContributorId: new Map(),
		commitContextEnrichers: [],
		commitExtractContributors: [],
		outboundPrepare: [],
		outboundRequest: [],
		uiPanels: [],
		loaded: [],
		failures: [],
		skippedDisabled: [],
	};
}

export function asArrayContribution(value: unknown): unknown[] {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? value : [value];
}
