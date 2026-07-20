type ChildProps = {
	label: string;
};

function Child({
	// label 是显示文案，用于按钮标题
	label,
}: ChildProps) {
	return <span>{label}</span>;
}

type GoodUsageProps = {
	label: string;
};

export function GoodUsage({
	// label 是显示文案，用于传给子组件
	label,
}: GoodUsageProps) {
	return (
		<div>
			{/* 引用了Child组件，用于展示传入标题 */}
			<Child label={label} />
		</div>
	);
}
