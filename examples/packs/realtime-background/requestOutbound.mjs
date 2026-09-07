/** L2 demo: outbound.request contribution (decision helper) */
export default function create() {
	return function request(input) {
		return {
			shouldCall: true,
			reason: "demo_outbound",
			input,
		};
	};
}
