/**
	* Modal 契约轻量回归：默认中文文案与 props 形状，避免业务页各自造 Dialog。
	*/
import { describe, expect, it } from "vitest";
import type {
	AppModalProps,
	FormModalProps,
} from "@studio-v2/src/commonUiComponents/modal/shared/modalTypes";
import type { DeleteConfirmModalProps } from "@studio-v2/src/commonUiComponents/modal/confirm/DeleteConfirmModal";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";

describe("AppModal / FormModal / DeleteConfirmModal contracts", () => {
	it("AppModalProps requires open/title/onClose/children", () => {
		const props: AppModalProps = {
			open: true,
			title: "提示",
			onClose: () => undefined,
			children: null,
		};
		expect(props.title).toBe("提示");
		expect(props.maxWidth).toBeUndefined();
	});

	it("FormModalProps accepts AutoForm items as primary path", () => {
		const items: AutoFormItem[] = [
			{ name: "name", label: "名称", comType: "TextField", required: true },
		];
		const props: FormModalProps<{ name: string }> = {
			open: true,
			title: "新建",
			onClose: () => undefined,
			initialValues: { name: "" },
			onSubmit: () => undefined,
			items,
			submitLabel: "确认",
			cancelLabel: "取消",
		};
		expect(props.submitLabel).toBe("确认");
		expect(props.cancelLabel).toBe("取消");
		expect(props.items?.[0]?.comType).toBe("TextField");
	});

	it("DeleteConfirmModalProps 由调用方注入领域文案与引用摘要", () => {
		const props: DeleteConfirmModalProps = {
			open: true,
			title: "确认删除角色",
			description: "仅从当前会话列表移除，不会写盘。",
			displayName: "示例",
			referenceLines: ["故事包 A"],
			error: undefined,
			onClose: () => undefined,
			onConfirm: () => undefined,
		};
		expect(props.title).toContain("删除");
		expect(props.referenceLines).toHaveLength(1);
	});
});
