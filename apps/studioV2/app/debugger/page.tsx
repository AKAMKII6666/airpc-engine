/**
	* 调试器路由：只做装配；叙事布局在 DebuggerShell。
	*/
import { DebuggerShell } from "@studio-v2/src/pageComponents/debugger/DebuggerShell";

type DebuggerPageProps = {
	/** 路由 query；编辑器入口会带 chapterId/cardId */
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DebuggerPage({
	// searchParams 是路由 query，用于编辑器入口自动进入指定卡
	searchParams,
}: DebuggerPageProps) {
	const params = (await searchParams) ?? {};
	const chapterId = firstParam(params.chapterId);
	const cardId = firstParam(params.cardId);
	return (
		// 引用了DebuggerShell组件，用于渲染电话调试器工作台
		<DebuggerShell initialChapterId={chapterId} initialCardId={cardId} />
	);
}

function firstParam(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}
