export const PREFERENCE_PERSISTENCE_EVENT = 'webos:owner-preference-persistence';

export interface PreferencePersistenceResult {
  scope: string;
  message: string | null;
}

/**
 * Report background preference writes without synchronously updating React
 * state inside the persistence effect itself.
 */
export function reportPreferencePersistence(scope: string, message: string | null): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<PreferencePersistenceResult>(
    PREFERENCE_PERSISTENCE_EVENT,
    { detail: { scope, message } },
  ));
}
