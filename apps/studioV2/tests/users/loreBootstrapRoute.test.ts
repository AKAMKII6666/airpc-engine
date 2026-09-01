/**
 * POST lore/bootstrap：bootstrapLore 前须 syncHostProfileAfterFsWrite 重载磁盘真源。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(function () {
	return {
		syncHostProfileAfterFsWrite: vi.fn(),
		ensureProfile: vi.fn(),
		bootstrapLore: vi.fn(),
	};
});

vi.mock("@studio-v2/src/utils/server/host/engineHost.server", () => ({
	getStudioV2EngineHost: vi.fn(async function () {
		return {
			ensureProfile: mocks.ensureProfile,
			bootstrapLore: mocks.bootstrapLore,
		};
	}),
}));

vi.mock(
	"@studio-v2/src/utils/server/users/syncHostProfileAfterFsWrite.server",
	() => ({
		syncHostProfileAfterFsWrite: mocks.syncHostProfileAfterFsWrite,
	}),
);

import { POST } from "../../app/api/users/[userId]/lore/bootstrap/route";

describe("POST /api/users/[userId]/lore/bootstrap", () => {
	beforeEach(function () {
		mocks.syncHostProfileAfterFsWrite.mockReset();
		mocks.ensureProfile.mockReset();
		mocks.bootstrapLore.mockReset();
		mocks.syncHostProfileAfterFsWrite.mockResolvedValue(undefined);
		mocks.ensureProfile.mockResolvedValue({ userId: "demo-user" });
		mocks.bootstrapLore.mockResolvedValue({
			lore: {
				version: 1,
				source: "llm",
				generatedAt: "2026-08-28T00:00:00.000Z",
				sharedPremise: "test",
				perspectives: {},
			},
			usedFallback: false,
		});
	});

	it("syncHostProfileAfterFsWrite 先于 bootstrapLore", async function () {
		const order: string[] = [];
		mocks.syncHostProfileAfterFsWrite.mockImplementation(async function () {
			order.push("sync");
		});
		mocks.ensureProfile.mockImplementation(async function () {
			order.push("ensure");
		});
		mocks.bootstrapLore.mockImplementation(async function () {
			order.push("bootstrap");
			return {
				lore: {
					version: 1,
					source: "llm",
					generatedAt: "2026-08-28T00:00:00.000Z",
					sharedPremise: "test",
					perspectives: {},
				},
				usedFallback: false,
			};
		});

		const res = await POST(
			new Request("http://localhost/api/users/demo-user/lore/bootstrap", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ force: true }),
			}),
			{ params: Promise.resolve({ userId: "demo-user" }) },
		);

		expect(res.status).toBe(200);
		expect(order).toEqual(["sync", "ensure", "bootstrap"]);
		expect(mocks.syncHostProfileAfterFsWrite).toHaveBeenCalledWith(
			"demo-user",
		);
		expect(mocks.bootstrapLore).toHaveBeenCalledWith("demo-user", {
			force: true,
		});
	});
});
