const ADMIN_SESSION_KEY = 'resi_admin_session_v1';

export const ADMIN_USERNAME = 'adminsju';
const ADMIN_PASSCODE = '2027';

export function verifyAdminCredentials(username: string, password: string): boolean {
  return username.trim() === ADMIN_USERNAME && password === ADMIN_PASSCODE;
}

export function isAdminAuthenticated(): boolean {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === ADMIN_USERNAME;
  } catch {
    return false;
  }
}

export function loginAdmin(
  username: string,
  password: string
): { ok: boolean; error?: string } {
  if (!verifyAdminCredentials(username, password)) {
    return {
      ok: false,
      error: 'Username atau Password salah. Hanya akun admin terdaftar yang diizinkan.',
    };
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(ADMIN_SESSION_KEY, ADMIN_USERNAME);
    }
  } catch {
    // ignore storage errors
  }
  return { ok: true };
}

export function logoutAdmin(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
  } catch {
    // ignore storage errors
  }
}
