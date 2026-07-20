/**
	* Realtime 音色前端枚举（label + value）。
	* 引擎 JSON 只存 persona.voiceId 字符串；本文件不进 rpg-engine。
	*/
import type { FormSelectOption } from "@studio-v2/src/commonUiComponents/form/formTypes";

/** 音色下拉选项；value 写入 persona.voiceId */
export const REALTIME_VOICE_OPTIONS: FormSelectOption[] = [
	{ label: "温柔女声", value: "zh_female_warm" },
	{ label: "清亮女声", value: "zh_female_clear" },
	{ label: "沉稳男声", value: "zh_male_calm" },
	{ label: "活力男声", value: "zh_male_bright" },
	{ label: "中性旁白", value: "zh_neutral_narrator" },
];
