import { describe, expect, it } from 'vitest';
import {
  ADMIN_USERNAME,
  isAdminAuthenticated,
  loginAdmin,
  logoutAdmin,
  verifyAdminCredentials,
} from './adminAuth';

function createMemorySessionStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe('adminAuth strictly enforces adminsju / 2027', () => {
  it('accepts only adminsju and 2027', () => {
    expect(verifyAdminCredentials(ADMIN_USERNAME, '2027')).toBe(true);
    expect(verifyAdminCredentials('adminsju ', '2027')).toBe(true);

    expect(verifyAdminCredentials('admin', '2027')).toBe(false);
    expect(verifyAdminCredentials('adminsju', '2026')).toBe(false);
    expect(verifyAdminCredentials('ADMINSJU', '2027')).toBe(false);
    expect(verifyAdminCredentials('', '')).toBe(false);
  });

  it('persists session on valid login and clears on logout', () => {
    globalThis.sessionStorage = createMemorySessionStorage();
    expect(isAdminAuthenticated()).toBe(false);

    const bad = loginAdmin('other', '1234');
    expect(bad.ok).toBe(false);
    expect(isAdminAuthenticated()).toBe(false);

    const good = loginAdmin('adminsju', '2027');
    expect(good.ok).toBe(true);
    expect(isAdminAuthenticated()).toBe(true);

    logoutAdmin();
    expect(isAdminAuthenticated()).toBe(false);
  });
});
