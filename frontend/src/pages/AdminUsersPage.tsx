import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";

import type { AdminUserSummary, HistorySummary } from "../api";
import { getAdminUserHistory, getAdminUsers, updateAdminUser } from "../api";
import PageLayout from "../components/PageLayout";
import { theme } from "../theme";

interface AdminUsersPageProps {
  token: string;
  topBar?: ReactNode;
}

function formatDateTime(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return new Date(timestamp).toLocaleString();
}

export default function AdminUsersPage({ token, topBar }: AdminUsersPageProps) {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [historyItems, setHistoryItems] = useState<HistorySummary[]>([]);
  const [historySearchInput, setHistorySearchInput] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadUsers = useCallback(
    async (search: string) => {
      setLoadingUsers(true);
      setError(null);
      try {
        const response = await getAdminUsers({
          token,
          search,
          limit: 50,
          offset: 0,
        });
        setUsers(response.items);
        setSelectedUser((previous) => {
          if (!previous) {
            return previous;
          }
          const updatedSelected = response.items.find((user) => user.id === previous.id) ?? null;
          if (!updatedSelected) {
            setHistoryItems([]);
          }
          return updatedSelected;
        });
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load users.";
        setError(message);
      } finally {
        setLoadingUsers(false);
      }
    },
    [token]
  );

  const loadUserHistory = useCallback(
    async (userId: number, search: string) => {
      setLoadingHistory(true);
      setError(null);
      try {
        const response = await getAdminUserHistory({
          token,
          userId,
          search,
          limit: 50,
          offset: 0,
        });
        setHistoryItems(response.items);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load user history.";
        setError(message);
      } finally {
        setLoadingHistory(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void loadUsers(activeSearch);
  }, [activeSearch, loadUsers]);

  useEffect(() => {
    if (!selectedUser) {
      return;
    }
    void loadUserHistory(selectedUser.id, historySearch);
  }, [selectedUser, historySearch, loadUserHistory]);

  const handleUserSearch = (event: FormEvent) => {
    event.preventDefault();
    setActiveSearch(searchInput.trim());
    setActionMessage(null);
  };

  const handleHistorySearch = (event: FormEvent) => {
    event.preventDefault();
    setHistorySearch(historySearchInput.trim());
  };

  const handleToggleActive = async (user: AdminUserSummary) => {
    setError(null);
    setActionMessage(null);
    try {
      const updated = await updateAdminUser({
        token,
        id: user.id,
        payload: { is_active: !user.is_active },
      });
      setUsers((prev) => prev.map((candidate) => (candidate.id === updated.id ? updated : candidate)));
      if (selectedUser && selectedUser.id === updated.id) {
        setSelectedUser(updated);
      }
      setActionMessage(
        `${updated.email} is now ${updated.is_active ? "active" : "inactive"}.`
      );
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Failed to update user.";
      setError(message);
    }
  };

  const handlePromoteToAdmin = async (user: AdminUserSummary) => {
    setError(null);
    setActionMessage(null);
    if (user.role === "admin") {
      setError("Admin role is locked and cannot be changed to user.");
      return;
    }
    try {
      const updated = await updateAdminUser({
        token,
        id: user.id,
        payload: { role: "admin" },
      });
      setUsers((prev) => prev.map((candidate) => (candidate.id === updated.id ? updated : candidate)));
      if (selectedUser && selectedUser.id === updated.id) {
        setSelectedUser(updated);
      }
      setActionMessage(`${updated.email} role updated to ${updated.role}.`);
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Failed to update role.";
      setError(message);
    }
  };

  return (
    <PageLayout
      topBar={topBar}
      title="Admin User Management"
      subtitle="Search users, manage role/status, and inspect selected user history."
    >
      <form
        onSubmit={handleUserSearch}
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <input
          type="text"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by email or username..."
          style={{
            flex: "1 1 260px",
            height: 42,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            padding: "0 12px",
            color: theme.textMain,
          }}
        />
        <button
          type="submit"
          style={{
            height: 42,
            border: "none",
            borderRadius: 10,
            padding: "0 14px",
            background: theme.primary,
            color: theme.surface,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Search Users
        </button>
      </form>

      {loadingUsers ? <p style={{ color: theme.textSoft, margin: "0 0 12px" }}>Loading users...</p> : null}
      {actionMessage ? <p style={{ color: theme.positive, margin: "0 0 12px" }}>{actionMessage}</p> : null}
      {error ? <p style={{ color: theme.negative, margin: "0 0 12px" }}>{error}</p> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {users.length === 0 ? (
          <p
            style={{
              margin: 0,
              padding: "12px 14px",
              border: `1px dashed ${theme.border}`,
              borderRadius: 12,
              color: theme.textSoft,
              background: theme.background,
            }}
          >
            No users found.
          </p>
        ) : (
          users.map((user) => (
            <article
              key={user.id}
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                background: theme.surface,
                padding: 12,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{user.email}</h3>
                  <p style={{ margin: "4px 0 0", color: theme.textSoft, fontSize: 13 }}>
                    Username: {user.username}
                  </p>
                </div>
                <p style={{ margin: 0, color: theme.textSoft, fontSize: 12 }}>
                  Created: {formatDateTime(user.created_at)}
                </p>
              </div>
              <p style={{ margin: 0, color: theme.textMain, fontWeight: 600, fontSize: 13 }}>
                Role: {user.role} | Active: {user.is_active ? "yes" : "no"} | Analyses: {user.analysis_count}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => void handleToggleActive(user)}
                  style={{
                    height: 34,
                    border: `1px solid ${user.is_active ? theme.negative : theme.positive}`,
                    borderRadius: 9,
                    padding: "0 10px",
                    background: theme.surface,
                    color: user.is_active ? theme.negative : theme.positive,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {user.is_active ? "Deactivate" : "Activate"}
                </button>
                {user.role === "admin" ? (
                  <button
                    type="button"
                    disabled
                    style={{
                      height: 34,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 9,
                      padding: "0 10px",
                      background: theme.background,
                      color: theme.textSoft,
                      fontWeight: 700,
                      cursor: "not-allowed",
                    }}
                  >
                    Admin Locked
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handlePromoteToAdmin(user)}
                    style={{
                      height: 34,
                      border: `1px solid ${theme.primary}`,
                      borderRadius: 9,
                      padding: "0 10px",
                      background: theme.surface,
                      color: theme.primary,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Set Admin
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(user);
                    setHistorySearchInput("");
                    setHistorySearch("");
                  }}
                  style={{
                    height: 34,
                    border: "none",
                    borderRadius: 9,
                    padding: "0 10px",
                    background: theme.primary,
                    color: theme.surface,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  View History
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {selectedUser ? (
        <section
          style={{
            marginTop: 20,
            borderTop: `1px solid ${theme.border}`,
            paddingTop: 20,
            display: "grid",
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>History for {selectedUser.email}</h2>
            <p style={{ margin: "6px 0 0", color: theme.textSoft }}>
              Username: {selectedUser.username}
            </p>
          </div>

          <form
            onSubmit={handleHistorySearch}
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              value={historySearchInput}
              onChange={(event) => setHistorySearchInput(event.target.value)}
              placeholder="Search selected user history by video title..."
              style={{
                flex: "1 1 260px",
                height: 40,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                padding: "0 12px",
                color: theme.textMain,
              }}
            />
            <button
              type="submit"
              style={{
                height: 40,
                border: "none",
                borderRadius: 10,
                padding: "0 12px",
                background: theme.primary,
                color: theme.surface,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Search History
            </button>
          </form>

          {loadingHistory ? <p style={{ color: theme.textSoft, margin: 0 }}>Loading selected user history...</p> : null}

          <div style={{ display: "grid", gap: 10 }}>
            {historyItems.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  padding: "12px 14px",
                  border: `1px dashed ${theme.border}`,
                  borderRadius: 12,
                  color: theme.textSoft,
                  background: theme.background,
                }}
              >
                No history records for this user.
              </p>
            ) : (
              historyItems.map((item) => (
                <article
                  key={item.id}
                  style={{
                    border: `1px solid ${theme.border}`,
                    borderRadius: 12,
                    background: theme.surface,
                    padding: 12,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: 15 }}>{item.video_title || item.video_id}</h3>
                    <p style={{ margin: 0, color: theme.textSoft, fontSize: 12 }}>
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>
                  <p style={{ margin: 0, color: theme.textSoft, fontSize: 13 }}>{item.youtube_url}</p>
                  <p style={{ margin: 0, color: theme.textMain, fontWeight: 600, fontSize: 13 }}>
                    Total: {item.total_comments} | NEG: {item.neg_count} | NEU: {item.neu_count} | POS: {item.pos_count}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}
    </PageLayout>
  );
}
