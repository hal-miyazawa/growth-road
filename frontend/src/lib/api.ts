const BASE = import.meta.env.VITE_API_BASE;

// 末尾の / を吸収
const baseUrl = BASE?.replace(/\/$/, "");

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${baseUrl}${path}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(`${res.status} ${res.statusText}`);
}

export async function apiPatch<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
