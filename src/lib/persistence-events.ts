export const PREFERENCE_PERSISTENCE_EVENT = 'webos:owner-preference-persistence';

export interface PreferencePersistenceResult {
  scope: string;
  message: string | null;
}

/**
 * Report background preference writes without synchronously updating React
 * state inside the persistence effect itself.
 */
const lastReportedStatus = new Map<string, string | null>();

export function reportPreferencePersistence(scope: string, message: string | null): void {
  if (typeof window === 'undefined') return;

  // Saving runs while sliders move and timers tick. Broadcast only when a
  // scope's persistence status actually changes, not once for every successful write.
  if (lastReportedStatus.has(scope) && lastReportedStatus.get(scope) === message) return;
  lastReportedStatus.set(scope, message);

  window.dispatchEvent(new CustomEvent<PreferencePersistenceResult>(
    PREFERENCE_PERSISTENCE_EVENT,
    { detail: { scope, message } },
  ));
}
