export type CoalescedSyncRunner<T> = () => Promise<T>;

export function createCoalescedSyncRunner<T>(task: () => Promise<T>): CoalescedSyncRunner<T> {
  let activeRun: Promise<T> | null = null;
  let rerunRequested = false;

  return () => {
    rerunRequested = true;
    if (activeRun) {
      return activeRun;
    }

    activeRun = (async () => {
      let result: T;
      try {
        do {
          rerunRequested = false;
          result = await task();
        } while (rerunRequested);
        return result;
      } finally {
        activeRun = null;
      }
    })();

    return activeRun;
  };
}
