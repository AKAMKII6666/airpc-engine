/**
 * V2-IO-2 / V2-IO-7：Content/Profile/EngineLog Port 注入面与缺省策略。
 */
import { describe, expect, it } from "vitest";
import {
	createEngineHost,
	isEngineError,
	type ContentPort,
	type EngineLogPort,
	type PackageValidateBundle,
	type ProfilePort,
	type WorkspaceSnapshot,
} from "../../src/index.js";

function createFakeProfilePort(): ProfilePort {
	return {
		async readProfile() {
			return null;
		},
		async writeProfile() {},
		async ensureProfile(input) {
			if (input.initial) {
				return input.initial;
			}
			throw new Error("fake ProfilePort: initial required");
		},
	};
}

function createFakeContentPort(): ContentPort {
	const empty: WorkspaceSnapshot = {
		workspaceKey: "fake",
		packages: [],
		characters: [],
		freeCards: [],
		scheduleCards: [],
	};
	const emptyBundle: PackageValidateBundle = {
		packageId: "x",
		conf: null,
		cards: [],
		characters: [],
	};
	return {
		async loadWorkspaceSnapshot() {
			return empty;
		},
		async readCard() {
			return null;
		},
		async readPackageConf() {
			return null;
		},
		async loadPackageForValidate(input) {
			return { ...emptyBundle, packageId: input.packageId };
		},
		async assetMetaExists() {
			return false;
		},
		async readAssetMeta() {
			return null;
		},
	};
}

function createFakeEngineLogPort(): EngineLogPort {
	return {
		async append() {},
		async readSlice() {
			return { locator: "fake://log", lines: [], truncated: false };
		},
	};
}

describe("createEngineHost Port injection getters", function () {
	it("未注入时 Port getter 为 null", function () {
		const host = createEngineHost({ persist: false });
		expect(host.getProfilePort()).toBeNull();
		expect(host.getContentPort()).toBeNull();
		expect(host.getEngineLogPort()).toBeNull();
		expect(host.getMemoryPort()).toBeNull();
	});

	it("注入后 Port getter 返回同一实例", function () {
		const profile = createFakeProfilePort();
		const content = createFakeContentPort();
		const engineLog = createFakeEngineLogPort();
		const host = createEngineHost({
			persist: false,
			profile,
			content,
			engineLog,
		});
		expect(host.getProfilePort()).toBe(profile);
		expect(host.getContentPort()).toBe(content);
		expect(host.getEngineLogPort()).toBe(engineLog);
	});

	it("显式 null 视为未注入", function () {
		const host = createEngineHost({
			persist: false,
			profile: null,
			content: null,
			engineLog: null,
			memory: null,
		});
		expect(host.getProfilePort()).toBeNull();
		expect(host.getContentPort()).toBeNull();
		expect(host.getEngineLogPort()).toBeNull();
		expect(host.getMemoryPort()).toBeNull();
	});

	it("注入 MemoryPort 后 getter 返回同一实例", function () {
		const memory = {
			async projectForCall() {
				return { softText: "", includedEntryIds: [] };
			},
			async search() {
				return [];
			},
			async getById() {
				return null;
			},
			async applyPatch() {},
			async commitAfterCall() {
				return { ok: true, writtenLayers: [] as [] };
			},
		};
		const host = createEngineHost({
			persist: false,
			memory,
		});
		expect(host.getMemoryPort()).toBe(memory);
	});
});

describe("createEngineHost Port injection required ports", function () {
	it("假 ContentPort / ProfilePort 满足类型合同", async function () {
		const content = createFakeContentPort();
		const snap = await content.loadWorkspaceSnapshot({
			workspaceKey: "/tmp",
		});
		expect(snap.packages).toEqual([]);
		const bundle = await content.loadPackageForValidate({
			workspaceKey: "/tmp",
			packageId: "demo",
		});
		expect(bundle.packageId).toBe("demo");
		expect(bundle.conf).toBeNull();
		const profile = createFakeProfilePort();
		expect(await profile.readProfile({ userId: "u1" })).toBeNull();
	});

	it("未注入 ProfilePort 时 ensureProfile 抛 ENGINE_INTERNAL", async function () {
		const host = createEngineHost({ persist: false });
		await expect(host.ensureProfile("u1")).rejects.toSatisfy(function (
			err: unknown,
		) {
			return (
				typeof err === "object" &&
				err !== null &&
				(err as { code?: string }).code === "ENGINE_INTERNAL"
			);
		});
	});

	it("未注入 ContentPort 时 loadWorkspace 抛 ENGINE_INTERNAL", async function () {
		const host = createEngineHost({ persist: false });
		await expect(host.loadWorkspace("/tmp")).rejects.toSatisfy(function (
			err: unknown,
		) {
			return (
				typeof err === "object" &&
				err !== null &&
				(err as { code?: string }).code === "ENGINE_INTERNAL"
			);
		});
	});
});

describe("createEngineHost EngineLogPort (V2-IO-7)", function () {
	it("未注入时 readLogFileSlice 返回空切片", async function () {
		const host = createEngineHost({ persist: false });
		const slice = await host.readLogFileSlice({ limit: 10 });
		expect(slice).toEqual({ file: "", lines: [], truncated: false });
	});

	it("注入后 appendWet 旁路经 Port.append", async function () {
		const appended: string[] = [];
		let resolveAppend!: () => void;
		const appendDone = new Promise<void>(function (resolve) {
			resolveAppend = resolve;
		});
		const engineLog: EngineLogPort = {
			async append(input) {
				appended.push(input.record.type);
				resolveAppend();
			},
			async readSlice() {
				return { locator: "fake://log", lines: [], truncated: false };
			},
		};
		const host = createEngineHost({
			persist: true,
			engineLog,
		});
		const rec = host.appendWet({
			type: "wet.annotation",
			userId: "u_log",
			sessionId: "s_log",
			note: "port-path",
		});
		expect(isEngineError(rec)).toBe(false);
		await appendDone;
		expect(appended).toContain("wet.annotation");
	});
});
