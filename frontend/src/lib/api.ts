const TOKEN_KEY = "inventory_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function baseUrl() {
  const env = import.meta.env.VITE_API_URL;
  if (env) return env.replace(/\/$/, "");
  return "";
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const h = new Headers(headers);
  h.set("Content-Type", "application/json");
  if (auth) {
    const t = getToken();
    if (t) h.set("Authorization", `Bearer ${t}`);
  }
  const res = await fetch(`${baseUrl()}${path}`, { ...rest, headers: h });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Some deploy misconfigurations return HTML (index page) instead of API JSON.
      if (!res.ok) {
        throw new Error(
          "API returned non-JSON response. Check VITE_API_URL and backend deployment."
        );
      }
      throw new Error("Received non-JSON response from API.");
    }
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "message" in data
        ? (data as { message?: unknown }).message
        : res.statusText;
    throw new Error(typeof msg === "string" ? msg : "Request failed");
  }
  return data as T;
}
