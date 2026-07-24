/**
	* 故事包列表会话 feature bis：从 store 投影给 UI；create / 导入 / 设首故事 / 删除后 bump 重拉。
	* 打开真源在 shell；本 hook 不发列表 GET。
	* 搜索/分页/Modal 开合等瞬时态仍由 page hook 持有；导航在 page（禁 bis 引 next/navigation）。
	*/
"use client";

import { useCallback } from "react";
import { commitCreatePackage } from "@studio-v2/src/bis/pageBis/packages/createPackage_bis";
import type { CreatePackageFormValues } from "@studio-v2/src/bis/pageBis/packages/createPackageForm";
import { commitDeletePackage } from "@studio-v2/src/bis/pageBis/packages/delete/deletePackage_bis";
import { setStartupPackage } from "@studio-v2/src/bis/pageBis/packages/list/setStartupPackage_bis";
import { usePackagesStore } from "@studio-v2/src/stores/packages/packagesStore";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/**
	* 故事包列表会话投影：供 page hook 绑 UI，不含搜索/分页/Modal 瞬时态。
	* 列表真源在 store；本类型只描述 bis 对外契约。
	*/
export type PackageListSessionBis = {
	/** 全量列表投影（未按搜索筛） */
	packages: StoryPackageSummary[];
	/** shell 列表加载中 */
	loading: boolean;
	/** 列表失败人话 */
	loadError: string | undefined;
	/**
		* 新建成功：prefer 选中 + bump 重拉；返回 packageId 供调用方导航。
		* 本 bis 不 push 路由（STRUCT-023）。
		*/
	onCreateSubmit: (values: CreatePackageFormValues) => Promise<{ packageId: string }>;
	/**
		* 导入确认后：bump 重拉；导航由调用方处理。
		* 写盘成功由 importPackage_bis 保证后再调用。
		*/
	onImported: (packageId: string) => void;
	/**
		* 设定首故事：写 workspace → bump 重拉。
		* 已是首故事时仍可幂等调用。
		*/
	onSetStartup: (packageId: string) => Promise<void>;
	/**
		* 删除故事包：写盘删目录 → bump 重拉。
		* 首故事 / 最后一包由服务端拒删。
		*/
	onDelete: (packageId: string) => Promise<void>;
};

/**
	* 订 packages store 列表切片 + create/导入/首故事/删除后 bump；供页 hook 消费。
	*/
export function usePackageListSessionBis(): PackageListSessionBis {
	const packages = usePackagesStore(function (s) {
		return s.packages;
	});
	const loading = usePackagesStore(function (s) {
		return s.loading;
	});
	const loadError = usePackagesStore(function (s) {
		return s.loadError;
	});
	const setPreferSelectedId = usePackagesStore(function (s) {
		return s.setPreferSelectedId;
	});
	const bumpPackagesRefreshStamp = usePackagesStore(function (s) {
		return s.bumpPackagesRefreshStamp;
	});

	const onCreateSubmit = useCallback(
		async function (
			values: CreatePackageFormValues,
		): Promise<{ packageId: string }> {
			const { packageId } = await commitCreatePackage(values);
			setPreferSelectedId(packageId);
			bumpPackagesRefreshStamp();
			return { packageId };
		},
		[setPreferSelectedId, bumpPackagesRefreshStamp],
	);

	const onImported = useCallback(
		function (packageId: string) {
			setPreferSelectedId(packageId);
			bumpPackagesRefreshStamp();
		},
		[setPreferSelectedId, bumpPackagesRefreshStamp],
	);

	const onSetStartup = useCallback(
		async function (packageId: string): Promise<void> {
			await setStartupPackage(packageId);
			bumpPackagesRefreshStamp();
		},
		[bumpPackagesRefreshStamp],
	);

	const onDelete = useCallback(
		async function (packageId: string): Promise<void> {
			await commitDeletePackage(packageId);
			bumpPackagesRefreshStamp();
		},
		[bumpPackagesRefreshStamp],
	);

	return {
		packages,
		loading,
		loadError,
		onCreateSubmit,
		onImported,
		onSetStartup,
		onDelete,
	};
}
