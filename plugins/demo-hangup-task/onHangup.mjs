/** L2 demo: afterHangup → register a short-delay task via capability API */
export default function create(api) {
	return {
		hookId: "demo.hangup_register_task",
		async run(input) {
			await api.tasks.register({
				taskId: `demo_tick_${Date.now()}`,
				fireAtMs: Date.now() + 2000,
				payload: {
					from: "afterHangup",
					userId: input.userId,
					characterId: input.agentId,
					chapterId: "demo_followup_chapter",
					cardId: "demo_followup_card",
				},
			});
		},
	};
}
