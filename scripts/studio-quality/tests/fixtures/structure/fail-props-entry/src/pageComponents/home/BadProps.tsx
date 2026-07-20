type BadPropsType = {
	label: string;
};

export function BadProps(props: BadPropsType) {
	return <span>{props.label}</span>;
}
