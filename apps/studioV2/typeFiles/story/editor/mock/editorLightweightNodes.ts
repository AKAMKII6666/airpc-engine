/**
	* 画布轻量节点投影：动作 / 注释分组。
	* 仅 Studio UI mock；禁止混入 CallCardDefinition / EditorCallCardProjection；不进引擎 schema。
	*/

/**
	* 动作节点 data；标题 + 可选摘要，不参与 CallCard 校验 badge。
	*/
export type EditorActionNodeData = {
	/** 节点标题；默认「动作节点」 */
	title: string;
	/**
		* 摘要人话；可选。
		* 仅 UI 展示；第一版不做 Effect 编排。
		*/
	summary?: string;
};

/**
	* 注释分组 data；虚线框标题，不参与 story 边引擎语义。
	*/
export type EditorCommentGroupNodeData = {
	/** 分组标题；默认「注释分组」 */
	title: string;
};
