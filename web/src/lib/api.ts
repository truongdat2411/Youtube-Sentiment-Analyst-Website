import type { AnalyzeCommentsResponse } from "@/types/analysis";
import type { TokenResponse, UserRead } from "@/types/auth";
import type { AnalysisHistoryListResponse } from "@/types/history";
import { getAuthToken } from "@/lib/auth-token";

/**
 * - Mặc định: đường dẫn tương đối `/api/v1` → Next rewrite tới FastAPI (tránh CORS / "Failed to fetch").
 * - Nếu set `NEXT_PUBLIC_API_BASE_URL` dạng http(s)://... thì gọi trực tiếp API (cần CORS khớp origin).
 */
function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw) return "/api/v1";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/$/, "");
  }
  if (raw.startsWith("/")) {
    return raw.replace(/\/$/, "") || "/api/v1";
  }
  return "/api/v1";
}

const base = getApiBase();

function authHeaders(jsonBody = false): HeadersInit {
  const h: Record<string, string> = {};
  if (jsonBody) h["Content-Type"] = "application/json";
  const token = getAuthToken();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function mapFetchError(err: unknown): string {
  if (!(err instanceof Error)) return "Đã xảy ra lỗi";
  const m = err.message;
  if (m === "Failed to fetch" || m.includes("NetworkError") || m.includes("Load failed")) {
    return [
      "Không kết nối được tới API (Failed to fetch).",
      "Kiểm tra backend đang chạy (vd http://localhost:8000/docs).",
      "Nếu đang gọi thẳng URL API từ trình duyệt, `CORS_ORIGINS` phải chứa đúng origin trang (vd http://localhost:3000).",
      "Khuyến nghị: dùng proxy Next — để `NEXT_PUBLIC_API_BASE_URL` trống hoặc `/api/v1` và `API_PROXY_TARGET` trỏ tới FastAPI.",
    ].join(" ");
  }
  return m;
}

async function parseJsonDetail(text: string): Promise<string> {
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
  if (typeof data === "object" && data !== null && "detail" in data) {
    const d = (data as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return JSON.stringify(d);
  }
  return text;
}

export async function analyzeComments(youtubeUrl: string): Promise<AnalyzeCommentsResponse> {
  let res: Response;
  try {
    res = await fetch(`${base}/analysis/comments`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ youtube_url: youtubeUrl }),
    });
  } catch (e) {
    throw new Error(mapFetchError(e));
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(await parseJsonDetail(text || res.statusText));
  }

  return JSON.parse(text) as AnalyzeCommentsResponse;
}

export async function loginApi(email: string, password: string): Promise<TokenResponse> {
  let res: Response;
  try {
    res = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (e) {
    throw new Error(mapFetchError(e));
  }
  const text = await res.text();
  if (!res.ok) {
    throw new Error(await parseJsonDetail(text || res.statusText));
  }
  return JSON.parse(text) as TokenResponse;
}

export async function registerApi(
  email: string,
  password: string,
  fullName?: string | null,
): Promise<TokenResponse> {
  let res: Response;
  try {
    res = await fetch(`${base}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName ?? undefined }),
    });
  } catch (e) {
    throw new Error(mapFetchError(e));
  }
  const text = await res.text();
  if (!res.ok) {
    throw new Error(await parseJsonDetail(text || res.statusText));
  }
  return JSON.parse(text) as TokenResponse;
}

export async function fetchMe(): Promise<UserRead> {
  let res: Response;
  try {
    res = await fetch(`${base}/auth/me`, { headers: authHeaders(false) });
  } catch (e) {
    throw new Error(mapFetchError(e));
  }
  const text = await res.text();
  if (!res.ok) {
    throw new Error(await parseJsonDetail(text || res.statusText));
  }
  return JSON.parse(text) as UserRead;
}

export async function fetchAnalysisHistory(skip = 0, limit = 50): Promise<AnalysisHistoryListResponse> {
  const qs = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  let res: Response;
  try {
    res = await fetch(`${base}/analysis/history?${qs}`, { headers: authHeaders(false) });
  } catch (e) {
    throw new Error(mapFetchError(e));
  }
  const text = await res.text();
  if (!res.ok) {
    throw new Error(await parseJsonDetail(text || res.statusText));
  }
  return JSON.parse(text) as AnalysisHistoryListResponse;
}
