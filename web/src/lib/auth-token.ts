const STORAGE_KEY = "sentiment_studio_access_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setAuthToken(token: string): void {
  window.localStorage.setItem(STORAGE_KEY, token);
}

export function clearAuthToken(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
