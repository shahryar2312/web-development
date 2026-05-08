// Central fetch wrapper for all backend API calls.
// - Always sends the session cookie (credentials: 'include')
// - Automatically unwraps the { success: true, data: {...} } response envelope
// - Throws an Error with .message and .status for non-2xx responses

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function apiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData;

  const headers = isFormData
    ? { ...options.headers }
    : { 'Content-Type': 'application/json', ...options.headers };

  const res = await fetch(BASE + path, {
    ...options,
    credentials: 'include',
    headers,
  });

  const body = await res.json();

  if (!res.ok) {
    const err = new Error(body.message || 'Something went wrong.');
    err.status = res.status;
    throw err;
  }

  const result = body.data ?? {};
  return body.meta ? { ...result, _meta: body.meta } : result;
}

export const api = {
  get:    (path)       => apiFetch(path),
  post:   (path, data) => apiFetch(path, { method: 'POST',   body: data instanceof FormData ? data : JSON.stringify(data) }),
  put:    (path, data) => apiFetch(path, { method: 'PUT',    body: data instanceof FormData ? data : JSON.stringify(data) }),
  patch:  (path, data) => apiFetch(path, { method: 'PATCH',  body: JSON.stringify(data) }),
  delete: (path)       => apiFetch(path, { method: 'DELETE' }),
};
