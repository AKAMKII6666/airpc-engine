/**
 * Quality gates are validators, not migrations. Capture the complete visible
 * worktree state so a gate cannot silently edit or create repository files.
 */
import { execFileSync } from "node:child_process";

/** @param {string} repoRoot */
export function captureWorktreeFingerprint(repoRoot) {
	return execFileSync(
		"git",
		["status", "--porcelain=v1", "--untracked-files=all"],
		{ cwd: repoRoot, encoding: "utf8" },
	);
}

/**
 * @param {string} repoRoot
 * @param {string} before
 * @param {string} gateName
 */
export function assertWorktreeUnchanged(repoRoot, before, gateName) {
	const after = captureWorktreeFingerprint(repoRoot);
	if (after !== before) {
		throw new Error(
			`${gateName} modified the worktree; quality checks must be read-only.`,
		);
	}
}
