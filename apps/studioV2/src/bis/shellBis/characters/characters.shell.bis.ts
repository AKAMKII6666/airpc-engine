/**
	* 角色库页级 shell：打开页 / refreshStamp → 灌 `stores/characters`。
	* 一类页只挂一次；不处理 create/save/delete 按钮（feature bis）。
	*/
"use client";

import { useEffect, useLayoutEffect } from "react";
import { characterDefToSummary } from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDefMapper";
import { useCharactersStore } from "@studio-v2/src/stores/characters/charactersStore";
import { fetchCharacterDefs } from "@studio-v2/src/utils/ajaxProxy/library/api/charactersApi";
import type { CharactersLoadResult } from "@studio-v2/typeFiles/library/characters/store/charactersStoreState";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 将 GET /api/characters 结果映射为 store 结果型载荷。
	* shell 只灌账；不在此写 CRUD。
	*/
export function toCharactersLoadResult(
	raw: Awaited<ReturnType<typeof fetchCharacterDefs>>,
): CharactersLoadResult {
	return {
		ok: true,
		characters: raw.map(characterDefToSummary),
	};
}

/**
	* 挂载于角色库页：按 refreshStamp 有界拉列表并灌 store。
	* layout 阶段先 applyListLoadStarted；离页 reset。
	*/
export function useCharactersShellBis(): void {
	const refreshStamp = useCharactersStore(function (s) {
		return s.refreshStamp;
	});
	const applyListLoadStarted = useCharactersStore(function (s) {
		return s.applyListLoadStarted;
	});
	const applyListLoadResult = useCharactersStore(function (s) {
		return s.applyListLoadResult;
	});
	const resetCharactersSession = useCharactersStore(function (s) {
		return s.resetCharactersSession;
	});

	useEffect(
		function () {
			return function () {
				resetCharactersSession();
			};
		},
		[resetCharactersSession],
	);

	useLayoutEffect(
		function () {
			let cancelled = false;
			applyListLoadStarted();
			void (async function () {
				try {
					const defs = await fetchCharacterDefs();
					if (cancelled) return;
					applyListLoadResult(toCharactersLoadResult(defs));
				} catch (error) {
					if (cancelled) return;
					applyListLoadResult({
						ok: false,
						message: errorMessage(error, "加载角色列表失败"),
					});
				}
			})();

			return function () {
				cancelled = true;
			};
		},
		[
			refreshStamp,
			applyListLoadStarted,
			applyListLoadResult,
		],
	);
}
