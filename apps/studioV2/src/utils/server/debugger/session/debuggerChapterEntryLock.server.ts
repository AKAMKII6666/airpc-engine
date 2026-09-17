/** Per-user chapter-entry mutex: concurrent HTTP retries observe current state. */
const pendingLocks = new Map<string, Promise<void>>();

export async function withDebuggerChapterEntryLock<T>(
	userId: string,
	task: () => Promise<T>,
): Promise<T> {
	const previous = pendingLocks.get(userId) ?? Promise.resolve();
	let release = function (): void {};
	const current = new Promise<void>(function (resolve) {
		release = resolve;
	});
	pendingLocks.set(userId, current);
	await previous;
	try {
		return await task();
	} finally {
		release();
		if (pendingLocks.get(userId) === current) pendingLocks.delete(userId);
	}
}
