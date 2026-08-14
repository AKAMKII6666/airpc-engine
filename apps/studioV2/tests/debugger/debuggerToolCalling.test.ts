/**
	* 调试器工具调用循环：LLM tool_calls 经 Host.invokeTool 再回给模型。
	*/
import { describe, expect, it } from "vitest";
import type {
	CallSession,
	EngineHost,
	RuntimeExitCandidate,
	ToolInvokeResult,
} from "@airpc/rpg-engine";
import type {
	ServerLlmChatInput,
	ServerLlmChatResult,
} from "@studio-v2/src/utils/server/debugger/llm/llmClient.server";
import { runDebuggerLlmWithTools } from "@studio-v2/src/utils/server/debugger/session/debuggerToolCalling.server";
import { projectDebuggerCallSession } from "@studio-v2/src/utils/server/debugger/session/debuggerCallSession.server";

function sessionFixture(): CallSession {
	return {
		schemaVersion: 1,
		sessionId: "session_1",
		userId: "demo-user",
		chapterId: "__free__",
		status: "in_call",
		startedAt: "2026-08-10T00:00:00.000Z",
		resolve: {
			source: "free",
			instanceId: "free_lanxing",
			cardId: "lanxing_free",
			agentId: "lanxing",
			intent: { kind: "free_call", agentId: "lanxing" },
		},
		frozenCard: {
			cardId: "lanxing_free",
			cardKind: "free",
			title: "澜星自由通话",
			ownerAgentId: "lanxing",
			entryMode: "either",
			interactionMode: "realtime_dialogue",
			context: {},
			exits: [],
			toolPolicy: { mode: "inherit_free" },
		},
		actualEntry: "inbound_user_dial",
		composeScene: {
			callDirection: "inbound",
			localTime: {
				isoWithOffset: "2026-08-10T08:00:00+08:00",
				timeZone: "Asia/Shanghai",
				localHour: 8,
			},
			timeMentionPolicy: "allow_casual",
		},
		renderedPrompt: {
			systemHard: [
				"[style.phone]\n短句。",
				"[conversation.inertia]\n不要重新完整自我介绍。",
			],
			openingSpeakable: "喂？我是澜星。",
			openingPolicy: {
				mode: "phone_short",
				reason: "phone",
				maxSentences: 2,
				forbidden: ["打错电话剧情开场"],
			},
			speakable: "",
			private: "",
			softContext: ["[conversation.inertia.recent_turns]\n- user: 刚才聊到提醒。"],
			matchedLayerIds: ["free_inbound"],
			debug: {
				providerIds: ["style.phone_global", "conversation.inertia"],
				notes: ["skip: CharacterDef.defaultPromptScenes"],
			},
		},
		channel: "text_turn",
		interactionPhase: "dialogue",
		phoneFlags: {},
		completedBeats: [],
		toolTrace: [],
		exitCandidates: [],
		shellEvents: [],
		effectLedger: {},
		chatTurns: [],
	};
}

function fakeLlmResult(
	patch: Partial<ServerLlmChatResult>,
): ServerLlmChatResult {
	return {
		text: "",
		toolCalls: [],
		finishReason: null,
		responseId: "resp",
		model: "qwen-test",
		...patch,
	};
}

describe("runDebuggerLlmWithTools", () => {
	it("exposes the first-version special FC capability matrix to the model", async () => {
		const session = sessionFixture();
		let firstTools: string[] = [];
		const host = {
			getSession() {
				return session;
			},
		} as unknown as EngineHost;

		await runDebuggerLlmWithTools({
			host,
			session,
			messages: [{ role: "user", content: "我们检查一下能力" }],
			temperature: 0.1,
			llmRunner: async function (input) {
				firstTools = input.tools?.map(function (tool) {
					return tool.function.name;
				}) ?? [];
				return fakeLlmResult({ text: "能力已就绪。" });
			},
		});

		expect(firstTools).toEqual(expect.arrayContaining([
			"refer_to_expert",
			"share_expert_number",
			"schedule_reminder_call",
			"schedule_recurring_call",
			"record_shared_secret",
			"create_research_commitment",
			"record_user_name",
			"search_memory",
			"get_memory_by_id",
			"request_hangup",
		]));
	});

	it("executes session_local tool call and returns final assistant text", async () => {
		const session = sessionFixture();
		const llmInputs: ServerLlmChatInput[] = [];
		const invoked: unknown[] = [];
		const host = {
			async invokeTool(sessionId: string, toolId: string, args?: unknown) {
				invoked.push({ sessionId, toolId, args });
				return {
					ok: true,
					behavior: "session_local",
					localResult: {
						status: "ok",
						count: 1,
						hits: [{ id: "mem_1", text: "露营那天你说过怕冷" }],
						next: "Use get_memory_by_id with one returned entry_id if the snippet is not enough.",
					},
				} satisfies ToolInvokeResult;
			},
			getSession() {
				return session;
			},
		} as unknown as EngineHost;

		const result = await runDebuggerLlmWithTools({
			host,
			session,
			messages: [{ role: "user", content: "你记得露营吗？" }],
			temperature: 0.1,
			llmRunner: async function (input) {
				llmInputs.push(input);
				if (llmInputs.length === 1) {
					return fakeLlmResult({
						finishReason: "tool_calls",
						toolCalls: [{
							id: "call_1",
							name: "search_memory",
							argumentsJson: "{\"text_query\":\"露营\"}",
						}],
					});
				}
				return fakeLlmResult({ text: "记得，你那天说有点冷。" });
			},
		});

		expect(llmInputs[0]?.tools?.map(function (tool) {
			return tool.function.name;
		})).toContain("search_memory");
		expect(invoked).toEqual([{
			sessionId: "session_1",
			toolId: "search_memory",
			args: { text_query: "露营" },
		}]);
		expect(llmInputs[1]?.messages.at(-1)).toMatchObject({
			role: "tool",
			toolCallId: "call_1",
		});
		expect(llmInputs[1]?.messages.at(-1)?.content).toContain("\"status\":\"ok\"");
		expect(llmInputs[1]?.messages.at(-1)?.content).toContain("\"next\"");
		expect(result.toolEvents).toMatchObject([{
			toolCallId: "call_1",
			toolId: "search_memory",
			round: 1,
			ok: true,
		}]);
		expect(result.llm.text).toBe("记得，你那天说有点冷。");
	});

	it("keeps register_exit candidate on Host session without ending call", async () => {
		const session = sessionFixture();
		const candidate: RuntimeExitCandidate = {
			candidateId: "candidate_1",
			toolId: "record_user_name",
			effects: [],
			priority: 50,
			registeredAt: "2026-08-10T00:00:00.000Z",
			args: { nickname: "小明" },
		};
		const host = {
			async invokeTool() {
				session.exitCandidates.push(candidate);
				return {
					ok: true,
					behavior: "register_exit",
					candidate,
				} satisfies ToolInvokeResult;
			},
			getSession() {
				return session;
			},
		} as unknown as EngineHost;

		const result = await runDebuggerLlmWithTools({
			host,
			session,
			messages: [{ role: "user", content: "我叫小明" }],
			temperature: 0.1,
			llmRunner: async function (input) {
				if (input.messages.length === 1) {
					return fakeLlmResult({
						finishReason: "tool_calls",
						toolCalls: [{
							id: "call_name",
							name: "record_user_name",
							argumentsJson: "{\"nickname\":\"小明\"}",
						}],
					});
				}
				return fakeLlmResult({ text: "好呀，我记住你叫小明。" });
			},
		});

		expect(result.session.status).toBe("in_call");
		expect(result.session.exitCandidates).toEqual([candidate]);
		expect(result.llm.text).toBe("好呀，我记住你叫小明。");
	});

	it("projects debugger tool observability fields for active call UI", () => {
		const session = sessionFixture();
		session.toolTrace.push({
			at: "2026-08-10T00:01:00.000Z",
			toolId: "record_user_name",
			behavior: "register_exit",
			candidateId: "candidate_1",
		});
		session.exitCandidates.push({
			candidateId: "candidate_1",
			toolId: "record_user_name",
			effects: [],
			priority: 50,
			registeredAt: "2026-08-10T00:01:00.000Z",
			args: { nickname: "小明" },
		});

		const view = projectDebuggerCallSession(
			session,
			fakeLlmResult({ text: "好呀，我记住了。" }),
			[{
				toolCallId: "call_name",
				toolId: "record_user_name",
				round: 1,
				argumentsJson: "{\"nickname\":\"小明\"}",
				resultContent: "{\"ok\":true,\"behavior\":\"register_exit\"}",
				ok: true,
			}],
		);

		expect(view.availableTools.map(function (tool) {
			return tool.toolId;
		})).toContain("search_memory");
		expect(view.promptTrace).toMatchObject({
			providerIds: ["style.phone_global", "conversation.inertia"],
			providerRows: [
				{
					providerId: "style.phone_global",
					index: 1,
					group: "style",
					important: true,
				},
				{
					providerId: "conversation.inertia",
					index: 2,
					group: "memory",
					important: true,
				},
			],
			matchedLayerIds: ["free_inbound"],
			openingSpeakable: "喂？我是澜星。",
			openingPolicy: {
				mode: "phone_short",
				maxSentences: 2,
				reason: "phone",
			},
			openingSituation: null,
		});
		expect(view.promptTrace.toolResolution).toMatchObject({
			cardPolicyMode: "inherit_free",
		});
		expect(view.promptTrace.toolResolution.finalToolIds).toContain(
			"search_memory",
		);
		expect(
			view.promptTrace.toolResolution.items.find(function (item) {
				return item.toolId === "search_memory";
			}),
		).toMatchObject({
			availability: "global",
			exposedToLlm: true,
			reason: "exposed",
		});
		expect(view.promptTrace.systemHardBlocks).toEqual([
			expect.objectContaining({
				title: "style.phone",
				preview: expect.stringContaining("短句"),
				truncated: false,
			}),
			expect.objectContaining({
				title: "conversation.inertia",
				preview: expect.stringContaining("不要重新完整自我介绍"),
				truncated: false,
			}),
		]);
		expect(view.promptTrace.softContextBlocks[0]).toMatchObject({
			title: "conversation.inertia.recent_turns",
			preview: expect.stringContaining("刚才聊到提醒"),
		});
		expect(view.recentToolEvents[0]).toMatchObject({
			toolCallId: "call_name",
			toolId: "record_user_name",
			ok: true,
		});
		expect(view.toolTrace[0]).toMatchObject({
			toolId: "record_user_name",
			candidateId: "candidate_1",
		});
		expect(view.exitCandidates[0]).toMatchObject({
			candidateId: "candidate_1",
			argsPreview: "{\n  \"nickname\": \"小明\"\n}",
		});
		expect(view.shellEvents).toEqual([]);
	});

	it("projects opening situation as readable prompt trace summary", () => {
		const session = sessionFixture();
		const prompt = session.renderedPrompt;
		if (!prompt) throw new Error("sessionFixture should include renderedPrompt");
		prompt.systemHard.unshift(
			[
				"[opening.situation]",
				"- kind=early_morning_inbound",
				"- control=provider",
				"- priority=68",
				"- reason=user dialed in early in the morning; opening may lightly acknowledge the early hour",
				"- tags=inbound,temporal,early_morning,unknown_caller",
				"- 本 provider 已决定/覆盖首句 opening。",
			].join("\n"),
		);

		const view = projectDebuggerCallSession(session, null, []);

		expect(view.promptTrace.openingSituation).toMatchObject({
			kind: "early_morning_inbound",
			control: "provider",
			priority: 68,
			reason:
				"user dialed in early in the morning; opening may lightly acknowledge the early hour",
			tags: ["inbound", "temporal", "early_morning", "unknown_caller"],
			overridden: true,
			firstTurnMode: null,
			firstTurnStatus: null,
			callerVisibility: null,
			llmContextPolicy: null,
		});
		expect(view.promptTrace.systemHardBlocks[0]).toMatchObject({
			title: "opening.situation",
		});
	});

	it("routes request_hangup through Host shell-control path", async () => {
		const session = sessionFixture();
		const businessInvoked: unknown[] = [];
		const shellInvoked: unknown[] = [];
		const host = {
			async invokeTool(sessionId: string, toolId: string, args?: unknown) {
				businessInvoked.push({ sessionId, toolId, args });
				return {
					ok: true,
					behavior: "session_local",
				} satisfies ToolInvokeResult;
			},
			invokeShellControlTool(sessionId: string, toolId: string, args?: unknown) {
				shellInvoked.push({ sessionId, toolId, args });
				const event = {
					schemaVersion: 1 as const,
					eventId: "shell_event_1",
					type: "call.hangup_requested" as const,
					sessionId,
					userId: session.userId,
					chapterId: session.chapterId,
					cardId: session.resolve.cardId,
					agentId: session.resolve.agentId,
					source: "llm_tool" as const,
					createdAt: "2026-08-10T00:02:00.000Z",
					reason: "说完晚安后挂断",
				};
				session.shellEvents = [event];
				session.phoneFlags.remote_hangup_requested = true;
				return {
					ok: true,
					toolId: "request_hangup",
					event,
					resultForLlm: {
						accepted: true,
						eventType: event.type,
						message: "Hangup request accepted by phone shell.",
					},
				};
			},
			getSession() {
				return session;
			},
		} as unknown as EngineHost;

		const result = await runDebuggerLlmWithTools({
			host,
			session,
			messages: [{ role: "user", content: "那先晚安吧" }],
			temperature: 0.1,
			llmRunner: async function (input) {
				if (input.messages.length === 1) {
					return fakeLlmResult({
						finishReason: "tool_calls",
						toolCalls: [{
							id: "call_hangup",
							name: "request_hangup",
							argumentsJson: "{\"reason\":\"说完晚安后挂断\"}",
						}],
					});
				}
				return fakeLlmResult({ text: "晚安，我先挂啦。" });
			},
		});

		expect(businessInvoked).toEqual([]);
		expect(shellInvoked).toEqual([{
			sessionId: "session_1",
			toolId: "request_hangup",
			args: { reason: "说完晚安后挂断" },
		}]);
		expect(result.session.shellEvents?.[0]).toMatchObject({
			type: "call.hangup_requested",
			reason: "说完晚安后挂断",
		});
		expect(projectDebuggerCallSession(
			result.session,
			result.llm,
			result.toolEvents,
		).shellEvents[0]).toMatchObject({
			type: "call.hangup_requested",
			reason: "说完晚安后挂断",
		});
		expect(result.toolEvents[0]).toMatchObject({
			toolCallId: "call_hangup",
			toolId: "request_hangup",
			ok: true,
		});
		expect(result.llm.text).toBe("晚安，我先挂啦。");
	});

	it("routes business FC and shell-control FC through separate Host paths in one turn", async () => {
		const session = sessionFixture();
		const businessInvoked: unknown[] = [];
		const shellInvoked: unknown[] = [];
		const host = {
			async invokeTool(sessionId: string, toolId: string, args?: unknown) {
				businessInvoked.push({ sessionId, toolId, args });
				const candidate: RuntimeExitCandidate = {
					candidateId: "candidate_schedule",
					toolId,
					effects: [{
						id: "reminder_1",
						effect: "schedule_call_card",
						agentId: "lanxing",
						cardId: "lanxing_callback_intro",
						chapterId: "wrong_number_act1",
						delayMinutes: 2,
					}],
					priority: 50,
					registeredAt: "2026-08-10T00:03:00.000Z",
					args: args as Record<string, unknown>,
				};
				session.exitCandidates.push(candidate);
				return {
					ok: true,
					behavior: "register_exit",
					candidate,
				} satisfies ToolInvokeResult;
			},
			invokeShellControlTool(sessionId: string, toolId: string, args?: unknown) {
				shellInvoked.push({ sessionId, toolId, args });
				const event = {
					schemaVersion: 1 as const,
					eventId: "shell_event_2",
					type: "call.hangup_requested" as const,
					sessionId,
					userId: session.userId,
					chapterId: session.chapterId,
					cardId: session.resolve.cardId,
					agentId: session.resolve.agentId,
					source: "llm_tool" as const,
					createdAt: "2026-08-10T00:03:01.000Z",
					reason: "约好两分钟后再打来",
				};
				session.shellEvents = [event];
				session.phoneFlags.remote_hangup_requested = true;
				return {
					ok: true,
					toolId: "request_hangup",
					event,
					resultForLlm: {
						accepted: true,
						eventType: event.type,
						message: "Hangup request accepted by phone shell.",
					},
				};
			},
			getSession() {
				return session;
			},
		} as unknown as EngineHost;

		const result = await runDebuggerLlmWithTools({
			host,
			session,
			messages: [{ role: "user", content: "两分钟后提醒我，然后你先挂" }],
			temperature: 0.1,
			llmRunner: async function (input) {
				if (input.messages.length === 1) {
					return fakeLlmResult({
						finishReason: "tool_calls",
						toolCalls: [{
								id: "call_schedule",
								name: "schedule_reminder_call",
								argumentsJson: JSON.stringify({
									delay_minutes: 2,
									topic_hint: "提醒用户继续调试",
								}),
						}, {
							id: "call_shell_hangup",
							name: "request_hangup",
							argumentsJson: JSON.stringify({
								reason: "约好两分钟后再打来",
							}),
						}],
					});
				}
				return fakeLlmResult({ text: "好，两分钟后我再打来。我先挂啦。" });
			},
		});

		expect(businessInvoked).toEqual([{
				sessionId: "session_1",
				toolId: "schedule_reminder_call",
				args: {
					delay_minutes: 2,
					topic_hint: "提醒用户继续调试",
				},
		}]);
		expect(shellInvoked).toEqual([{
			sessionId: "session_1",
			toolId: "request_hangup",
			args: { reason: "约好两分钟后再打来" },
		}]);
		expect(result.session.exitCandidates[0]).toMatchObject({
			toolId: "schedule_reminder_call",
		});
		expect(result.session.shellEvents?.[0]).toMatchObject({
			type: "call.hangup_requested",
			reason: "约好两分钟后再打来",
		});
		expect(result.toolEvents.map(function (event) {
			return event.toolId;
		})).toEqual(["schedule_reminder_call", "request_hangup"]);
		expect(result.llm.text).toBe("好，两分钟后我再打来。我先挂啦。");
	});
});
