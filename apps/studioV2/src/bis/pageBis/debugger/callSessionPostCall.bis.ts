/**
	* 调试通话 bis：挂机后 job 轮询与重试。
	*/
"use client";

import { useCallback, useEffect, useState } from "react";
import {
	fetchDebuggerPostCallJobs,
	postDebuggerPostCallRetry,
} from "@studio-v2/src/utils/ajaxProxy/debugger/api/callSession/http/callSessionApi";
import { errorMessage } from "./callSessionCommands.bis";

type PostCallJobsActions = {
	applyPostCallJobsLoadStarted: () => void;
	applyPostCallJobsLoadResult: (
		jobs: Awaited<ReturnType<typeof fetchDebuggerPostCallJobs>>,
	) => void;
	applyPostCallJobsLoadFailed: (message: string) => void;
};

/** 挂机后 job 轮询/重试控件；从 callSession bis 抽出以降复杂度 */
export function usePostCallJobsControls(actions: PostCallJobsActions) {
	const [postCallRetryingJobId, setPostCallRetryingJobId] = useState<
		string | null
	>(null);

	const refreshPostCallJobs = useCallback(
		function () {
			actions.applyPostCallJobsLoadStarted();
			void fetchDebuggerPostCallJobs()
				.then(actions.applyPostCallJobsLoadResult)
				.catch(function (err) {
					actions.applyPostCallJobsLoadFailed(errorMessage(err));
				});
		},
		[
			actions.applyPostCallJobsLoadStarted,
			actions.applyPostCallJobsLoadResult,
			actions.applyPostCallJobsLoadFailed,
		],
	);

	const retryPostCallJob = useCallback(
		async function (jobId: string) {
			setPostCallRetryingJobId(jobId);
			try {
				await postDebuggerPostCallRetry(jobId);
				refreshPostCallJobs();
			} catch (err) {
				actions.applyPostCallJobsLoadFailed(errorMessage(err));
			} finally {
				setPostCallRetryingJobId(null);
			}
		},
		[refreshPostCallJobs, actions.applyPostCallJobsLoadFailed],
	);

	useEffect(function () {
		refreshPostCallJobs();
		const timer = setInterval(refreshPostCallJobs, 1500);
		return function () {
			clearInterval(timer);
		};
	}, [refreshPostCallJobs]);

	return {
		postCallRetryingJobId,
		refreshPostCallJobs,
		retryPostCallJob,
	};
}
