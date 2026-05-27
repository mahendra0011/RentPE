const apiBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export async function apiRequest(path, options = {}) {
  const response = await fetch(resolveApiUrl(path), options);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload;
}

function resolveApiUrl(path) {
  if (/^https?:\/\//.test(path)) return path;
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function toQueryString(params) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === false) return;
    if (Array.isArray(value)) {
      if (value.length) searchParams.set(key, value.join(","));
      return;
    }
    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}
