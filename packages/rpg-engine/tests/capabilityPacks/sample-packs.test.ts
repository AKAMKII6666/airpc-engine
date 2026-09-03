/**
 * L1-C 样板：user-location（T4）与 outbound-window-gate（T5）。
 */
import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	isEngineError,
	mergeCapabilityPacks,
	OUTBOUND_WINDOW_GATE_ID,
	OUTBOUND_WINDOW_GATE_PACK_ID,
	outboundWindowGatePack,
	outboundWindowScheduleGate,
	shouldDeferByScheduleGates,
	USER_LOCATION_PACK_ID,
	USER_LOCATION_PROVIDER_ID,
	userLocationPack,
} from "../../src/index.js";
import { copyDataTree, createTestHost } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("capabilityPacks L1-C samples", function () {
	it("T4 user-location appears in softContext when pack enabled", async function () {
		const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-l1c-loc-"));
		try {
			const dataRoot = path.join(tmpRoot, "data");
			await copyDataTree(dataSrc, dataRoot);
			const merged = mergeCapabilityPacks({
				packs: [userLocationPack],
				enabledPackIds: [USER_LOCATION_PACK_ID],
			});
			const host = createTestHost({
				persist: false,
				dataRoot,
				promptProviderRegistry: merged.promptProviderRegistry,
			});
			await host.loadWorkspace(dataRoot);
			const profile = await host.ensureProfile("demo-user");
			profile.user.location = {
				country: "中国",
				province: "上海",
				city: "上海",
				district: "浦东",
			};
			const resolved = await host.resolveAsync("demo-user", {
				kind: "free_call",
				agentId: "lanxing",
			});
			if (isEngineError(resolved)) throw resolved;
			const session = await host.beginCall("demo-user", resolved, {
				channel: "manual",
			});
			if (isEngineError(session)) throw session;
			expect(session.renderedPrompt.debug?.providerIds).toContain(
				USER_LOCATION_PROVIDER_ID,
			);
			expect(
				session.renderedPrompt.softContext.some(function (block) {
					return block.startsWith("[location]");
				}),
			).toBe(true);
		} finally {
			await rm(tmpRoot, { recursive: true, force: true });
		}
	});

	it("T5 outbound-window-gate defers outside window", function () {
		const merged = mergeCapabilityPacks({
			packs: [outboundWindowGatePack],
			enabledPackIds: [OUTBOUND_WINDOW_GATE_PACK_ID],
		});
		expect(merged.scheduleGates.map(function (g) {
			return g.gateId;
		})).toEqual([OUTBOUND_WINDOW_GATE_ID]);

		const profile = {
			user: {
				userId: "u1",
				nickname: "t",
				createdAt: "",
				updatedAt: "",
				outboundWindow: { from: 9, to: 21 },
			},
			callCards: { board: { byAgent: {} } },
			schedule: { clockMs: 0, intents: [] },
		} as Parameters<typeof shouldDeferByScheduleGates>[1];

		const outside = "2026-09-03T02:00:00+08:00";
		const inside = "2026-09-03T10:00:00+08:00";
		expect(
			shouldDeferByScheduleGates(merged.scheduleGates, profile, outside),
		).toBe(true);
		expect(
			shouldDeferByScheduleGates(merged.scheduleGates, profile, inside),
		).toBe(false);
		expect(
			outboundWindowScheduleGate.allow({ profile, nowIso: outside }),
		).toBe(false);
		const gateEvent = {
			type: "capabilityPack.schedule_gate" as const,
			packId: OUTBOUND_WINDOW_GATE_PACK_ID,
			gateId: OUTBOUND_WINDOW_GATE_ID,
			allowed: outboundWindowScheduleGate.allow({
				profile,
				nowIso: outside,
			}),
		};
		expect(gateEvent.allowed).toBe(false);
	});
});
