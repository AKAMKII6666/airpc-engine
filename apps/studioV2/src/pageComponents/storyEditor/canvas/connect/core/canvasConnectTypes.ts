/**
	* 画布连线类型与公共 SetState 别名。
	*/
import type { Dispatch, SetStateAction } from "react";
import type { Edge, Node } from "@xyflow/react";

export type SetNodes = Dispatch<SetStateAction<Node[]>>;
export type SetEdges = Dispatch<SetStateAction<Edge[]>>;
