import { useAuthStore } from "../store";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const auth = useAuthStore.getState();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const authToken = sessionStorage.getItem('auth_token');
  if (authToken) {
    headers["x-auth-token"] = authToken;
  }

  if (auth.csrfToken) {
    headers["x-csrf-token"] = auth.csrfToken;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    auth.logout();
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_timestamp');
    window.location.href = "/login";
    throw new ApiError("未授权，请重新登录", 401);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "请求失败" }));
    throw new ApiError(error.error || `HTTP ${response.status}`, response.status);
  }

  return response;
}
