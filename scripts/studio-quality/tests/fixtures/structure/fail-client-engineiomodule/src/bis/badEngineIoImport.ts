// Client bis 不得引用 engineIOModule；本夹具故意违规，供 STUDIO-STRUCT-020 回归。
import { createEngineIOPorts } from "@studio-v2/engineIOModule/createEngineIOPorts";

export function leakPorts() {
	return createEngineIOPorts;
}
