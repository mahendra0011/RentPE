const apiBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export async function apiRequest(path, options = {}) {
  const response = await fetch(resolveApiUrl(path), options);
  const payload = await parseApiResponse(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response));
  }

  return payload;
}

async function parseApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!text.trim()) return null;

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("API returned invalid JSON. Check the backend response.");
    }
  }

  return text;
}

function getErrorMessage(payload, response) {
  if (payload?.message) return payload.message;
  if (typeof payload === "string" && payload.trim()) {
    if (payload.trim().startsWith("<")) {
      return "API returned an HTML page. Check VITE_API_URL and backend deployment.";
    }
    return payload.trim();
  }
  return response.statusText || "Request failed";
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
