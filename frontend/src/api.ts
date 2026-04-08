export type Label = "NEG" | "NEU" | "POS";

export interface Probabilities {
  NEG: number;
  NEU: number;
  POS: number;
}

export interface AnalyzeItem {
  comment_id: string;
  author: string;
  published_at: string;
  text: string;
  label: Label;
  probs: Probabilities;
}

export interface AnalyzeResponse {
  video_id: string;
  video_title?: string | null;
  items: AnalyzeItem[];
}

export interface AnalyzeRequest {
  youtube_url: string;
  max_comments: number;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: "user" | "admin";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
}

export interface HistorySummary {
  id: number;
  youtube_url: string;
  video_id: string;
  video_title: string | null;
  thumbnail_url: string | null;
  total_comments: number;
  neg_count: number;
  neu_count: number;
  pos_count: number;
  created_at: string;
}

export interface HistoryDetail extends HistorySummary {
  result_json: AnalyzeResponse;
}

export interface HistoryListResponse {
  items: HistorySummary[];
  limit: number;
  offset: number;
}

export interface AdminUserSummary {
  id: number;
  email: string;
  username: string;
  role: "user" | "admin";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  analysis_count: number;
}

export interface AdminUsersListResponse {
  items: AdminUserSummary[];
  limit: number;
  offset: number;
}

export interface AdminUserUpdateRequest {
  role?: "user" | "admin";
  is_active?: boolean;
}

const API_BASE_URL = "http://localhost:8000";

interface RequestOptions extends RequestInit {
  token?: string | null;
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const resolvedHeaders = new Headers(headers);
  if (!resolvedHeaders.has("Content-Type") && rest.body !== undefined) {
    resolvedHeaders.set("Content-Type", "application/json");
  }
  if (token) {
    resolvedHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: resolvedHeaders,
  });

  const maybeJson = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      maybeJson && typeof maybeJson === "object" && "detail" in maybeJson
        ? (maybeJson as { detail?: unknown }).detail
        : "Request failed.";
    throw new Error(String(message ?? "Request failed."));
  }
  return maybeJson as T;
}

export async function analyzeComments(
  payload: AnalyzeRequest,
  token?: string | null
): Promise<AnalyzeResponse> {
  return requestJson<AnalyzeResponse>("/api/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function registerUser(payload: RegisterRequest): Promise<AuthUser> {
  return requestJson<AuthUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: LoginRequest): Promise<TokenResponse> {
  return requestJson<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  return requestJson<AuthUser>("/auth/me", {
    method: "GET",
    token,
  });
}

export async function getHistoryList(params: {
  token: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<HistoryListResponse> {
  const query = new URLSearchParams();
  if (params.search && params.search.trim()) {
    query.set("search", params.search.trim());
  }
  if (typeof params.limit === "number") {
    query.set("limit", String(params.limit));
  }
  if (typeof params.offset === "number") {
    query.set("offset", String(params.offset));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson<HistoryListResponse>(`/api/history${suffix}`, {
    method: "GET",
    token: params.token,
  });
}

export async function getHistoryDetail(params: {
  token: string;
  id: number;
}): Promise<HistoryDetail> {
  return requestJson<HistoryDetail>(`/api/history/${params.id}`, {
    method: "GET",
    token: params.token,
  });
}

export async function deleteHistoryItem(params: { token: string; id: number }): Promise<void> {
  await requestJson<unknown>(`/api/history/${params.id}`, {
    method: "DELETE",
    token: params.token,
  });
}

export async function getAdminUsers(params: {
  token: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminUsersListResponse> {
  const query = new URLSearchParams();
  if (params.search && params.search.trim()) {
    query.set("search", params.search.trim());
  }
  if (typeof params.limit === "number") {
    query.set("limit", String(params.limit));
  }
  if (typeof params.offset === "number") {
    query.set("offset", String(params.offset));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson<AdminUsersListResponse>(`/admin/users${suffix}`, {
    method: "GET",
    token: params.token,
  });
}

export async function updateAdminUser(params: {
  token: string;
  id: number;
  payload: AdminUserUpdateRequest;
}): Promise<AdminUserSummary> {
  return requestJson<AdminUserSummary>(`/admin/users/${params.id}`, {
    method: "PATCH",
    token: params.token,
    body: JSON.stringify(params.payload),
  });
}

export async function getAdminUserHistory(params: {
  token: string;
  userId: number;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<HistoryListResponse> {
  const query = new URLSearchParams();
  if (params.search && params.search.trim()) {
    query.set("search", params.search.trim());
  }
  if (typeof params.limit === "number") {
    query.set("limit", String(params.limit));
  }
  if (typeof params.offset === "number") {
    query.set("offset", String(params.offset));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson<HistoryListResponse>(`/admin/users/${params.userId}/history${suffix}`, {
    method: "GET",
    token: params.token,
  });
}
