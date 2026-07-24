/** 夹具：UI 直读 store，应触发 STUDIO-STRUCT-021 */
import { useDemoStore } from "@studio-v2/src/stores/demoStore";
import { fetchDemo } from "@studio-v2/src/utils/ajaxProxy/demoApi";

export function BadUi() {
	useDemoStore();
	void fetchDemo;
	return null;
}
