import { ensureParentDirectory } from "../config/config";

const STALE_LOCK_MS = 30 * 60 * 1000;

export interface LockResult {
  acquired: boolean;
  release: () => Promise<void>;
  reason?: string;
}

export async function acquireLock(path: string, now = new Date()): Promise<LockResult> {
  await ensureParentDirectory(path);
  const file = Bun.file(path);

  if (await file.exists()) {
    const text = await file.text();
    const lock = parseLock(text);
    if (lock && now.getTime() - lock.createdAt.getTime() <= STALE_LOCK_MS) {
      return { acquired: false, release: async () => {}, reason: "another poller run is active" };
    }
  }

  await Bun.write(path, JSON.stringify({ pid: process.pid, createdAt: now.toISOString() }, null, 2));

  return {
    acquired: true,
    release: async () => {
      try {
        await Bun.$`rm -f ${path}`.quiet();
      } catch {
        // Best effort cleanup only.
      }
    },
  };
}

function parseLock(text: string): { createdAt: Date } | null {
  try {
    const parsed = JSON.parse(text) as { createdAt?: string };
    if (!parsed.createdAt) return null;
    const createdAt = new Date(parsed.createdAt);
    if (!Number.isFinite(createdAt.getTime())) return null;
    return { createdAt };
  } catch {
    return null;
  }
}
