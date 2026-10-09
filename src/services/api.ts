/**
 * The one place the UI talks to the API. Same origin (`/api`, forwarded to the API server by
 * Next), so the httpOnly session cookie goes along and no token is ever handled in JavaScript.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export type ApiResponse<T> = { status: number; data: T };

/**
 * Sends a request and returns status + parsed JSON without throwing for 4xx answers: callers
 * turn expected outcomes (wrong password, locked…) into results. Network failures and 5xx throw.
 */
export async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResponse<T>> {
  const hasBody = init.body !== undefined;
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? (hasBody ? 'POST' : 'GET'),
    credentials: 'same-origin',
    headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
    body: hasBody ? JSON.stringify(init.body) : undefined
  });
  if (res.status >= 500) throw new ApiError(res.status);
  const text = await res.text();
  return { status: res.status, data: (text ? JSON.parse(text) : null) as T };
}

/** For calls where anything but success is unexpected. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await request<T>(path, init);
  if (res.status >= 400) throw new ApiError(res.status);
  return res.data;
}

export class ApiError extends Error {
  constructor(public status: number) {
    super(`API ${status}`);
  }
}
