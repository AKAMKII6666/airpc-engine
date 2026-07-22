/**
	* 人格扮演码（personalityCode）前端枚举。
	* 引擎只存字符串；Composer 对 16 型 MBTI 规范化为大写。
	*/
import type { FormSelectOption } from "@studio-v2/src/commonUiComponents/form/formTypes";

/** 标准 16 型 MBTI；value 写入 persona.personalityCode */
export const PERSONALITY_CODE_OPTIONS: FormSelectOption[] = [
	{ label: "ISTJ · 物流师", value: "ISTJ" },
	{ label: "ISFJ · 守卫者", value: "ISFJ" },
	{ label: "INFJ · 提倡者", value: "INFJ" },
	{ label: "INTJ · 建筑师", value: "INTJ" },
	{ label: "ISTP · 鉴赏家", value: "ISTP" },
	{ label: "ISFP · 探险家", value: "ISFP" },
	{ label: "INFP · 调停者", value: "INFP" },
	{ label: "INTP · 逻辑学家", value: "INTP" },
	{ label: "ESTP · 企业家", value: "ESTP" },
	{ label: "ESFP · 表演者", value: "ESFP" },
	{ label: "ENFP · 竞选者", value: "ENFP" },
	{ label: "ENTP · 辩论家", value: "ENTP" },
	{ label: "ESTJ · 总经理", value: "ESTJ" },
	{ label: "ESFJ · 执政官", value: "ESFJ" },
	{ label: "ENFJ · 主人公", value: "ENFJ" },
	{ label: "ENTJ · 指挥官", value: "ENTJ" },
];
