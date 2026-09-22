/**
	* 故事包列表：导航类按钮（进入/调试/导出）。
	*/
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button } from "@mui/material";

export type PackageListNavButtonsProps = {
	packageId: string;
};

export const PackageListNavButtons: FC<PackageListNavButtonsProps> =
	function PackageListNavButtons({
		// packageId 是故事包 id，用于进入章列表链接
		packageId,
	}) {
		return (
			<>
				{/* 引用了Button组件，用于进入章列表 */}
				<Button
					component={Link}
					href={`/packages/${encodeURIComponent(packageId)}`}
					size="small"
					variant="contained"
				>
					进入故事包
				</Button>
				{/* 引用了Button组件，用于进入调试台 */}
				<Button
					component={Link}
					href="/debugger"
					size="small"
					variant="outlined"
				>
					调试
				</Button>
				{/* 引用了Button组件，用于单包导出页 */}
				<Button
					component={Link}
					href="/packages/export"
					size="small"
					variant="text"
				>
					导出
				</Button>
			</>
		);
	};
