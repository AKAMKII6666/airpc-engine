/** L2 demo: afterHangup → register a short-delay task via capability API */
export default function create(api) {
	return {
		hookId: "demo.hangup_register_task",
		async run() {
			await api.tasks.register({
				taskId: `demo_tick_${Date.now()}`,
				fireAtMs: Date.now() + 2000,
				payload: { from: "afterHangup" },
			});
		},
	};
}
