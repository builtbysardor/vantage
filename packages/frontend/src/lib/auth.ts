const TOKEN_KEY = "vantage_token";
const NEXUS_TOKEN_KEY = "vantage_nexus_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `vantage_token=${token}; path=/; max-age=${60 * 60 * 8}`;
}

export function getNexusToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NEXUS_TOKEN_KEY);
}

export function setNexusToken(token: string) {
  localStorage.setItem(NEXUS_TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NEXUS_TOKEN_KEY);
  document.cookie = "vantage_token=; path=/; max-age=0";
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
