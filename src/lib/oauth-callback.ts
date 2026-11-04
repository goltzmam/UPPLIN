/** Prevent duplicate native URL events from consuming the same one-use PKCE code. */
export function createCallbackProcessor(deps: {
  exchange: (code: string) => Promise<boolean>;
  hasSession: () => Promise<boolean>;
  complete: () => Promise<void>;
  fail: () => void;
}) {
  const completed = new Set<string>();
  const pending = new Map<string, Promise<void>>();
  return (code: string): Promise<void> => {
    if (completed.has(code)) return Promise.resolve();
    const existing = pending.get(code);
    if (existing) return existing;
    const job = (async () => {
      let exchanged = false;
      try { exchanged = await deps.exchange(code); } catch { /* Check the session before showing an error. */ }
      if (exchanged) {
        completed.add(code);
        await deps.complete();
      } else if (!(await deps.hasSession().catch(() => false))) {
        deps.fail();
      } else {
        // A replayed launch URL must never invalidate an already established login.
        completed.add(code);
      }
    })().finally(() => pending.delete(code));
    pending.set(code, job);
    return job;
  };
}
