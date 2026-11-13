const pending = new Set<Promise<unknown>>();

// Integration tests keep real asynchronous handlers, but must finish their DB
// reads/writes before the next fixture takes exclusive TRUNCATE locks.
export function trackBackgroundWork<T>(work: Promise<T>): Promise<T> {
  pending.add(work);
  const release = () => {
    pending.delete(work);
  };
  void work.then(release, release);
  return work;
}

export async function drainBackgroundWork() {
  // A subscriber may enqueue another event or a notification delivery.
  while (pending.size) await Promise.allSettled([...pending]);
}
