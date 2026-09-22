/**
	* 导入向导步骤；done 仅用于确认后跳转前的瞬时态。
	*/
export type ImportFlowStep = "pick" | "precheck" | "confirm" | "done";
