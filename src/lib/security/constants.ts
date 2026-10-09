export const COOKIE_SESSION_NAME = 'webos_session_token';
export const COOKIE_GUEST_PASSWORD_NAME = 'webos_guest_access_token';
export const COOKIE_GUEST_SESSION_NAME = 'webos_guest_session_token';
export const COOKIE_MAX_AGE_DAYS = 30;
export const COOKIE_MAX_AGE_SECONDS = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;

export const SESSION_EXPIRY_DAYS = 30;

export const SECURITY_EVENT_TYPES = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  LOGOUT_ALL: 'logout_all',
  PASSWORD_CHANGED: 'password_changed',
  USERNAME_CHANGED: 'username_changed',
  SESSION_REVOKED: 'session_revoked',
  CONTENT_CREATED: 'content_created',
  CONTENT_UPDATED: 'content_updated',
  CONTENT_DELETED: 'content_deleted',
  CONTENT_PUBLISHED: 'content_published',
  CONTENT_UNPUBLISHED: 'content_unpublished',
  PAGE_CREATED: 'page_created',
  PAGE_UPDATED: 'page_updated',
  PAGE_DELETED: 'page_deleted',
  SETTINGS_CHANGED: 'settings_changed',
  PUBLIC_PASSWORD_CHANGED: 'public_password_changed',
  PANIC_LOCK_TRIGGERED: 'panic_lock_triggered',
  EXPORT_DOWNLOADED: 'export_downloaded',
  IMPORT_EXECUTED: 'import_executed',
} as const;

export const DEFAULT_THEME_TOKENS = {
  light: {
    bg: '#F8F6F0',
    surface: '#FFFFFF',
    surfaceSubtle: '#F2EFEB',
    text: '#1F1E1B',
    mutedText: '#716C62',
    border: '#E3DFD5',
    accent: '#BA4311',
    accentHover: '#A0380D',
    accentSubtle: '#FDF1EB',
  },
  dark: {
    bg: '#141412',
    surface: '#1C1C19',
    surfaceSubtle: '#242420',
    text: '#EAE8E2',
    mutedText: '#9A958A',
    border: '#32312A',
    accent: '#E66828',
    accentHover: '#F27A3D',
    accentSubtle: '#2A1D16',
  },
};
