/** L2 demo: begin.softExtras enricher */
export default {
	enricherId: "demo.soft_extra",
	apply() {
		return "[plugin:demo-soft-extra]\n第三方 soft 块已注入。";
	},
};
