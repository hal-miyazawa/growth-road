const BASE = import.meta.env.VITE_API_BASE;

// 末尾の / を吸収
const baseUrl = BASE?.replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function buildHeaders(contentType?: string): HeadersInit {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem("access_token");

  if (contentType) headers["Content-Type"] = contentType;
  if (token) headers.Authorization = `Bearer ${token}`;

  return headers;
}

async function parseError(res: Response): Promise<never> {
  const text = await res.text();
  if (!text) {
    throw new ApiError(res.status, `${res.status} ${res.statusText}`);
  }

  let message = text;
  try {
    const json = JSON.parse(text) as { detail?: string };
    if (typeof json.detail === "string" && json.detail) {
      message = json.detail;
    }
  } catch {
    // Fall back to raw text message.
  }

  throw new ApiError(res.status, message);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, init);
  if (!res.ok) await parseError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { headers: buildHeaders() });
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: buildHeaders("application/json"),
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path: string): Promise<void> {
  await request<void>(path, {
    method: "DELETE",
    headers: buildHeaders(),
  });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    headers: buildHeaders("application/json"),
    body: JSON.stringify(body),
  });
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    headers: buildHeaders("application/json"),
    body: JSON.stringify(body),
  });
}
