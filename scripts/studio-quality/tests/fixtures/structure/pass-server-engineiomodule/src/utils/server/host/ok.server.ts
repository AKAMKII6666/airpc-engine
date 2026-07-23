// Server 装配允许引用 engineIOModule 创建 Port 并注入 Host（STUDIO-STRUCT-020 不误伤）。
import { createEngineIOPorts } from "@studio-v2/engineIOModule/createEngineIOPorts";

export function wirePorts() {
	return createEngineIOPorts;
}
