import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RootApp from "../src/RootApp";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("RootApp auth and history flows", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = "#/";
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("protects history route for guests", async () => {
    window.location.hash = "#/history";
    vi.stubGlobal("fetch", vi.fn());

    render(<RootApp />);

    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByText("Please log in to access your saved history.")).toBeInTheDocument();
  });

  it("restores session on startup when token exists", async () => {
    window.localStorage.setItem("web_sentiment_access_token", "token-restore");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init?.method ?? "GET").toUpperCase();
      if (url.endsWith("/auth/me") && method === "GET") {
        return jsonResponse(200, {
          id: 7,
          email: "restore@example.com",
          username: "restore_user",
          role: "user",
          is_active: true,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        });
      }
      return jsonResponse(404, { detail: "Not found" });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<RootApp />);

    expect(await screen.findByText(/Signed in as/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("logs out and clears stored token", async () => {
    window.localStorage.setItem("web_sentiment_access_token", "token-logout");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init?.method ?? "GET").toUpperCase();
      if (url.endsWith("/auth/me") && method === "GET") {
        return jsonResponse(200, {
          id: 11,
          email: "logout@example.com",
          username: "logout_user",
          role: "user",
          is_active: true,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        });
      }
      return jsonResponse(404, { detail: "Not found" });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<RootApp />);

    expect(await screen.findByText(/Signed in as/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Logout" }));
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(window.localStorage.getItem("web_sentiment_access_token")).toBeNull();
  });

  it("blocks admin route for authenticated non-admin user", async () => {
    window.location.hash = "#/admin";
    window.localStorage.setItem("web_sentiment_access_token", "token-user");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init?.method ?? "GET").toUpperCase();
      if (url.endsWith("/auth/me") && method === "GET") {
        return jsonResponse(200, {
          id: 41,
          email: "normal@example.com",
          username: "normal_user",
          role: "user",
          is_active: true,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        });
      }
      return jsonResponse(404, { detail: "Not found" });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<RootApp />);

    expect(await screen.findByRole("heading", { name: "Unauthorized" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("supports login, authenticated analyze, and history open/delete flow", async () => {
    const user = userEvent.setup();
    const historyRecords = [
      {
        id: 1,
        youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        video_id: "dQw4w9WgXcQ",
        video_title: "Sample comments (YOUTUBE_API_KEY missing)",
        thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        total_comments: 1,
        neg_count: 0,
        neu_count: 0,
        pos_count: 1,
        created_at: "2026-03-14T15:00:00Z",
      },
    ];
    let analyzeAuthHeader = "";

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlText = typeof input === "string" ? input : input.toString();
      const url = new URL(urlText);
      const method = (init?.method ?? "GET").toUpperCase();
      const headers = new Headers(init?.headers);

      if (url.pathname === "/auth/login" && method === "POST") {
        return jsonResponse(200, { access_token: "token-login", token_type: "bearer" });
      }
      if (url.pathname === "/auth/me" && method === "GET") {
        return jsonResponse(200, {
          id: 9,
          email: "user@example.com",
          username: "user_demo",
          role: "user",
          is_active: true,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        });
      }
      if (url.pathname === "/api/analyze" && method === "POST") {
        analyzeAuthHeader = headers.get("Authorization") || "";
        return jsonResponse(200, {
          video_id: "dQw4w9WgXcQ",
          video_title: "Feature Video",
          items: [
            {
              comment_id: "c1",
              author: "Alice",
              published_at: "2026-03-07T00:00:00Z",
              text: "Great video!",
              label: "POS",
              probs: { NEG: 0.01, NEU: 0.09, POS: 0.9 },
            },
          ],
        });
      }
      if (url.pathname === "/api/history" && method === "GET") {
        const search = url.searchParams.get("search") || "";
        const filtered = historyRecords.filter((item) =>
          item.video_title?.toLowerCase().includes(search.toLowerCase())
        );
        return jsonResponse(200, { items: filtered, limit: 50, offset: 0 });
      }
      if (url.pathname === "/api/history/1" && method === "GET") {
        return jsonResponse(200, {
          ...historyRecords[0],
          result_json: {
            video_id: "dQw4w9WgXcQ",
            video_title: "Sample comments (YOUTUBE_API_KEY missing)",
            items: [
              {
                comment_id: "c1",
                author: "Alice",
                published_at: "2026-03-07T00:00:00Z",
                text: "Great video!",
                label: "POS",
                probs: { NEG: 0.01, NEU: 0.09, POS: 0.9 },
              },
            ],
          },
        });
      }
      if (url.pathname === "/api/history/1" && method === "DELETE") {
        historyRecords.splice(0, 1);
        return new Response(null, { status: 204 });
      }

      return jsonResponse(404, { detail: "Not found" });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<RootApp />);

    await user.click(screen.getByRole("button", { name: "Login" }));
    await user.type(screen.getByPlaceholderText("you@example.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Your password"), "StrongPass123");
    const loginForm = screen.getByPlaceholderText("Your password").closest("form");
    if (!loginForm) {
      throw new Error("Login form not found.");
    }
    await user.click(within(loginForm).getByRole("button", { name: "Login" }));

    expect(await screen.findByText(/Signed in as/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("https://www.youtube.com/watch?v=..."), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    expect(await screen.findByText(/Video:\s*Feature Video/)).toBeInTheDocument();
    expect(analyzeAuthHeader).toBe("Bearer token-login");

    await user.click(screen.getByRole("button", { name: "History" }));
    expect(await screen.findByRole("heading", { name: "Analysis History" })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search by video title..."), "Sample comments");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("Sample comments (YOUTUBE_API_KEY missing)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("heading", { name: "Saved Result" })).toBeInTheDocument();
    expect(screen.getByText("Great video!")).toBeInTheDocument();

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.queryByText("Sample comments (YOUTUBE_API_KEY missing)")).not.toBeInTheDocument()
    );
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  it("shows admin page for admin user and supports user management actions", async () => {
    window.localStorage.setItem("web_sentiment_access_token", "token-admin");
    const userRows = [
      {
        id: 101,
        email: "alice@example.com",
        username: "alice",
        role: "user",
        is_active: true,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z",
        analysis_count: 3,
      },
      {
        id: 102,
        email: "bob@example.com",
        username: "bob",
        role: "admin",
        is_active: true,
        created_at: "2026-03-02T00:00:00Z",
        updated_at: "2026-03-02T00:00:00Z",
        analysis_count: 5,
      },
    ];
    const historyByUser: Record<number, Array<Record<string, unknown>>> = {
      101: [
        {
          id: 9001,
          youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          video_id: "dQw4w9WgXcQ",
          video_title: "Alice history title",
          thumbnail_url: null,
          total_comments: 10,
          neg_count: 2,
          neu_count: 3,
          pos_count: 5,
          created_at: "2026-03-10T00:00:00Z",
        },
      ],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlText = typeof input === "string" ? input : input.toString();
      const url = new URL(urlText);
      const method = (init?.method ?? "GET").toUpperCase();

      if (url.pathname === "/auth/me" && method === "GET") {
        return jsonResponse(200, {
          id: 1,
          email: "admin@example.com",
          username: "admin",
          role: "admin",
          is_active: true,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        });
      }

      if (url.pathname === "/admin/users" && method === "GET") {
        const search = (url.searchParams.get("search") || "").toLowerCase();
        const filtered = userRows.filter(
          (user) => user.email.toLowerCase().includes(search) || user.username.toLowerCase().includes(search)
        );
        return jsonResponse(200, { items: filtered, limit: 50, offset: 0 });
      }

      if (url.pathname.startsWith("/admin/users/") && method === "PATCH") {
        const id = Number(url.pathname.split("/").at(-1));
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          role?: "user" | "admin";
          is_active?: boolean;
        };
        const row = userRows.find((item) => item.id === id);
        if (!row) {
          return jsonResponse(404, { detail: "User not found." });
        }
        if (typeof body.role === "string") {
          row.role = body.role;
        }
        if (typeof body.is_active === "boolean") {
          row.is_active = body.is_active;
        }
        row.updated_at = "2026-03-15T00:00:00Z";
        return jsonResponse(200, row);
      }

      if (url.pathname.endsWith("/history") && method === "GET") {
        const userId = Number(url.pathname.split("/")[3]);
        const search = (url.searchParams.get("search") || "").toLowerCase();
        const source = historyByUser[userId] ?? [];
        const filtered = source.filter((item) =>
          String(item.video_title || "").toLowerCase().includes(search)
        );
        return jsonResponse(200, { items: filtered, limit: 50, offset: 0 });
      }

      return jsonResponse(404, { detail: "Not found" });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<RootApp />);

    expect(await screen.findByText(/Signed in as/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Admin" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Admin" }));
    expect(await screen.findByRole("heading", { name: "Admin User Management" })).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search by email or username..."), "alice");
    await user.click(screen.getByRole("button", { name: "Search Users" }));
    expect(await screen.findByText("alice@example.com")).toBeInTheDocument();
    expect(screen.queryByText("bob@example.com")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(await screen.findByText("alice@example.com is now inactive.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set Admin" }));
    expect(await screen.findByText("alice@example.com role updated to admin.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View History" }));
    expect(await screen.findByRole("heading", { name: "History for alice@example.com" })).toBeInTheDocument();
    expect(await screen.findByText("Alice history title")).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("Search selected user history by video title..."),
      "alice history"
    );
    await user.click(screen.getByRole("button", { name: "Search History" }));
    expect(await screen.findByText("Alice history title")).toBeInTheDocument();
  });
});
