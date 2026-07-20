/**
	* 角色详情 Formik values 类型（对齐 CharacterDef 嵌套编辑投影）。
	*/
import type {
	CharacterEditGender,
	PromptSceneLayerForm,
	PromptVariantForm,
} from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";

/**
	* 详情编辑 values；嵌套路径供 AutoForm 自动绑。
	* 交叉 Record 以满足 Formik / AutoForm 约束。
	*/
export type CharacterDetailFormValues = {
	displayName: string;
	identity: {
		fullName: string;
		nickname: string;
		gender: CharacterEditGender;
		age: number | "";
		birthday: string;
	};
	meta: {
		phoneNumber: string;
		avatarAssetId: string;
	};
	persona: {
		voiceId: string;
		voiceNotes: string;
		systemPrompt: string;
		speakingStyle: string;
		exampleLines: string[];
		profession: string;
	};
	callFlowPrompts: {
		longSilence: PromptVariantForm[];
		longCallNudge: PromptVariantForm[];
		preHangupFarewell: PromptVariantForm[];
	};
	defaultPromptScenes: PromptSceneLayerForm[];
} & Record<string, unknown>;
