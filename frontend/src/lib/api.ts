const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("access_token");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data as T;
}
