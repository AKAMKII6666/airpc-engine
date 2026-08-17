/**
	* 挂机后副作用执行面板：不可手动关闭，随后台 endCall 完成自动消失。
	*/
"use client";

import type { FC } from "react";
import {
	Dialog,
	DialogContent,
	LinearProgress,
	Stack,
	Typography,
} from "@mui/material";
import type { PostCallEffectOverlayState } from "@studio-v2/src/pageComponents/debugger/hooks/useDebuggerPrototypeSession";

export type PostCallEffectOverlayProps = {
	/** 挂机后副作用执行状态 */
	state: PostCallEffectOverlayState;
};

export const PostCallEffectOverlay: FC<PostCallEffectOverlayProps> =
	function PostCallEffectOverlay({ state }) {
		return (
			<Dialog
				open={state.open}
				fullScreen
				disableEscapeKeyDown
				aria-labelledby="post-call-effect-title"
			>
				<DialogContent
					sx={{
						display: "grid",
						placeItems: "center",
						bgcolor: "rgba(16, 18, 24, 0.92)",
						color: "#f8fafc",
					}}
				>
					<Stack
						spacing={2}
						sx={{
							width: "min(680px, 92vw)",
							border: "1px solid rgba(248, 250, 252, 0.18)",
							borderRadius: "8px",
							p: 3,
							bgcolor: "rgba(17, 24, 39, 0.96)",
						}}
					>
						<Typography id="post-call-effect-title" variant="h6">
							{state.title || "正在收尾通话"}
						</Typography>
						<LinearProgress color="inherit" />
						<Stack
							component="ol"
							spacing={1}
							sx={{
								m: 0,
								pl: 2.5,
								maxHeight: "48vh",
								overflow: "auto",
								fontFamily:
									'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
								fontSize: 13,
								lineHeight: 1.6,
							}}
						>
							{state.lines.map((line, index) => (
								<Typography
									key={`${index}:${line}`}
									component="li"
									variant="body2"
									sx={{ color: "#dbeafe", wordBreak: "break-word" }}
								>
									{line}
								</Typography>
							))}
						</Stack>
					</Stack>
				</DialogContent>
			</Dialog>
		);
	};
