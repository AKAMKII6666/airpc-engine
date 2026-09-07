/**
 * 测试用 mock 能力 API：默认空实现，可用 overrides 覆盖单域。
 * 生产宿主不得用本工厂替代真实 Port 门面。
 */
import type {
	PluginCapabilityApi,
	PluginCharactersApi,
	PluginLlmApi,
	PluginMemoryApi,
	PluginOutboundApi,
	PluginSessionApi,
	PluginTasksApi,
	PluginUsersApi,
} from "./api.js";

export interface CreateMockPluginCapabilityApiOptions {
	pluginId?: string;
	users?: Partial<PluginUsersApi>;
	characters?: Partial<PluginCharactersApi>;
	memory?: Partial<PluginMemoryApi>;
	llm?: Partial<PluginLlmApi>;
	session?: Partial<PluginSessionApi>;
	tasks?: Partial<PluginTasksApi>;
	outbound?: Partial<PluginOutboundApi>;
}

function createUsersMock(overrides?: Partial<PluginUsersApi>): PluginUsersApi {
	return {
		async list() {
			return [];
		},
		async get() {
			return null;
		},
		async update(userId, patch) {
			return { userId, ...patch };
		},
		async getCurrentContext() {
			return null;
		},
		...overrides,
	};
}

function createCharactersMock(
	overrides?: Partial<PluginCharactersApi>,
): PluginCharactersApi {
	return {
		async list() {
			return [];
		},
		async get() {
			return null;
		},
		async getRuntime() {
			return null;
		},
		async updateRuntime(_userId, characterId, patch) {
			return { characterId, ...patch };
		},
		...overrides,
	};
}

function createMemoryMock(overrides?: Partial<PluginMemoryApi>): PluginMemoryApi {
	return {
		async query() {
			return [];
		},
		async search() {
			return [];
		},
		async write(_userId, _characterId, record) {
			return { ...record };
		},
		async update(_userId, _characterId, memoryId, patch) {
			return {
				id: `mock_appended_${memoryId}`,
				...patch,
				updatedFrom: memoryId,
				appendedEntryId: `mock_appended_${memoryId}`,
				inplaceUpdate: false,
			};
		},
		async getProjection() {
			return null;
		},
		...overrides,
	};
}

function createLlmMock(overrides?: Partial<PluginLlmApi>): PluginLlmApi {
	return {
		async chatText() {
			return { text: "" };
		},
		async chatStructured() {
			return null;
		},
		...overrides,
	};
}

function createSessionMock(overrides?: Partial<PluginSessionApi>): PluginSessionApi {
	return {
		async getSummary() {
			return null;
		},
		subscribeEvents() {
			throw new Error("session.subscribeEvents:not_wired");
		},
		async injectSpeakable() {
			throw new Error("session.injectSpeakable:not_wired");
		},
		async reportToolResult() {
			throw new Error("session.reportToolResult:not_wired");
		},
		async registerExitCandidate() {
			throw new Error("session.registerExitCandidate:not_wired");
		},
		...overrides,
	};
}

function createTasksMock(overrides?: Partial<PluginTasksApi>): PluginTasksApi {
	return {
		async register(task) {
			return task;
		},
		async cancel() {},
		async list() {
			return [];
		},
		async get() {
			return null;
		},
		...overrides,
	};
}

function createOutboundMock(
	overrides?: Partial<PluginOutboundApi>,
): PluginOutboundApi {
	return {
		async requestCall() {
			return { accepted: false, reason: "mock" };
		},
		async getDialability() {
			return null;
		},
		...overrides,
	};
}

/** 工厂：单元测试注入插件 entry 时使用 */
export function createMockPluginCapabilityApi(
	options: CreateMockPluginCapabilityApiOptions = {},
): PluginCapabilityApi {
	return {
		pluginId: options.pluginId ?? "mock-plugin",
		users: createUsersMock(options.users),
		characters: createCharactersMock(options.characters),
		memory: createMemoryMock(options.memory),
		llm: createLlmMock(options.llm),
		session: createSessionMock(options.session),
		tasks: createTasksMock(options.tasks),
		outbound: createOutboundMock(options.outbound),
	};
}

/** 别名：与需求文案 mockApi 对齐 */
export const mockApi = createMockPluginCapabilityApi;
