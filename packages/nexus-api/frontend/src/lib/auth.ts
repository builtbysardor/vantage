const TOKEN_KEY = 'nexus_token';

function setCookie(name: string, value: string, path = '/') {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=${path}; SameSite=Lax`;
}

function deleteCookie(name: string, path = '/') {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string): void {
  localStorage.setItem(TOKEN_KEY, t);
  setCookie(TOKEN_KEY, t);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  deleteCookie(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
