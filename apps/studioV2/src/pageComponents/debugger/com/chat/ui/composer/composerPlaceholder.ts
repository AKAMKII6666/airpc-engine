/**
	* Composer 占位文案：按挂断 / 忙碌态切换，避免主组件堆分支。
	*/
export function composerPlaceholder(
	disabled: boolean,
	isBusy: boolean,
): string {
	if (disabled) return "对方已挂断，无法继续发送";
	if (isBusy) return "正在回复消息，请稍候...";
	return "输入玩家在通话中说的话...";
}
