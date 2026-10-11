/**
 * Run expensive initialization only once per module instance.
 *
 * Concurrent callers share the same promise. If initialization fails, clear the
 * promise so a later request can retry after a transient database failure.
 */
export function createSingleFlight<T>(task: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;

  return () => {
    if (!inFlight) {
      inFlight = Promise.resolve()
        .then(task)
        .catch((error: unknown) => {
          inFlight = null;
          throw error;
        });
    }

    return inFlight;
  };
}
