const apiBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export class ApiResponseError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ApiResponseError";
    this.status = details.status || 0;
    this.url = details.url || "";
    this.htmlResponse = Boolean(details.htmlResponse);
    this.networkError = Boolean(details.networkError);
  }
}

export async function apiRequest(path, options = {}) {
  const url = resolveApiUrl(path);
  let response;

  try {
    response = await fetch(url, withAuthHeaders(options));
  } catch {
    throw new ApiResponseError(
      "Backend API is not reachable. Check VITE_API_URL and backend deployment.",
      {
        networkError: true,
        url,
      },
    );
  }

  const payload = await parseApiResponse(response);
  const htmlResponse = isHtmlPayload(payload, response);

  if (htmlResponse) {
    throw new ApiResponseError(
      "Backend API returned an HTML page. Set VITE_API_URL to the Express backend URL, not the frontend URL.",
      {
        status: response.status,
        url: response.url || url,
        htmlResponse: true,
      },
    );
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response));
  }

  return payload;
}

function withAuthHeaders(options) {
  const headers = new Headers(options.headers || {});
  const token = getStoredToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return { ...options, headers };
}

function getStoredToken() {
  try {
    return JSON.parse(localStorage.getItem("RentPE:auth"))?.token || "";
  } catch {
    return "";
  }
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
