type ChildProps = {
	label: string;
};

function Child({
	// label 是显示文案，用于按钮标题
	label,
}: ChildProps) {
	return <span>{label}</span>;
}

export function BadUsage() {
  const label = "保存";
	return (
		<div>
			<Child label={label} />
		</div>
	);
}
