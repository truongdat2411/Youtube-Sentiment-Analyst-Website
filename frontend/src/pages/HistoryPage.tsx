import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import type { AnalyzeItem, HistoryDetail, HistorySummary, Label } from "../api";
import { deleteHistoryItem, getHistoryDetail, getHistoryList } from "../api";
import CommentTable from "../components/CommentTable";
import ExportCSV from "../components/ExportCSV";
import Filters, { type FilterValue } from "../components/Filters";
import PageLayout from "../components/PageLayout";
import StatsCharts from "../components/StatsCharts";
import { theme } from "../theme";

type SortValue = "CONF_DESC" | "CONF_ASC" | "NEWEST" | "OLDEST";

interface HistoryPageProps {
  token: string;
  topBar?: ReactNode;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLabel(value: unknown): Label {
  const normalized = safeString(value).toUpperCase();
  if (normalized === "NEG" || normalized === "NEU" || normalized === "POS") {
    return normalized;
  }
  return "NEU";
}

function confidenceOf(item: AnalyzeItem): number {
  return Math.max(item.probs.NEG, item.probs.NEU, item.probs.POS);
}

function parsePublishedAt(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function normalizeItems(value: unknown): AnalyzeItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const row = item as Record<string, unknown>;
      const probs =
        row.probs && typeof row.probs === "object" ? (row.probs as Record<string, unknown>) : {};
      return {
        comment_id: safeString(row.comment_id) || `row-${index}`,
        author: safeString(row.author),
        published_at: safeString(row.published_at),
        text: safeString(row.text),
        label: normalizeLabel(row.label),
        probs: {
          NEG: safeNumber(probs.NEG),
          NEU: safeNumber(probs.NEU),
          POS: safeNumber(probs.POS),
        },
      } satisfies AnalyzeItem;
    })
    .filter((item): item is AnalyzeItem => item !== null);
}

function formatDateTime(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return new Date(timestamp).toLocaleString();
}

export default function HistoryPage({ token, topBar }: HistoryPageProps) {
  const [historyItems, setHistoryItems] = useState<HistorySummary[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<HistoryDetail | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [commentSearch, setCommentSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>("CONF_DESC");

  const loadHistory = useCallback(
    async (search: string) => {
      setLoadingList(true);
      setError(null);
      try {
        const response = await getHistoryList({
          token,
          search,
          limit: 50,
          offset: 0,
        });
        setHistoryItems(response.items);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load history.";
        setError(message);
      } finally {
        setLoadingList(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void loadHistory(activeSearch);
  }, [activeSearch, loadHistory]);

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setActiveSearch(searchInput.trim());
    setActionMessage(null);
  };

  const handleOpen = async (id: number) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const detail = await getHistoryDetail({ token, id });
      setSelectedDetail(detail);
      setFilter("ALL");
      setCommentSearch("");
      setSortBy("CONF_DESC");
      setActionMessage(null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load history detail.";
      setError(message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async (id: number) => {
    const shouldDelete = window.confirm("Delete this history record?");
    if (!shouldDelete) {
      return;
    }
    setError(null);
    try {
      await deleteHistoryItem({ token, id });
      if (selectedDetail && selectedDetail.id === id) {
        setSelectedDetail(null);
      }
      setActionMessage("History record deleted.");
      await loadHistory(activeSearch);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete history record.";
      setError(message);
    }
  };

  const detailItems = useMemo(
    () => normalizeItems(selectedDetail?.result_json?.items),
    [selectedDetail?.result_json?.items]
  );

  const filteredDetailItems = useMemo(() => {
    const normalizedSearch = commentSearch.trim().toLowerCase();
    return detailItems.filter((item) => {
      const matchesFilter = filter === "ALL" ? true : item.label === filter;
      if (!matchesFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return (
        item.text.toLowerCase().includes(normalizedSearch) ||
        item.author.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [detailItems, filter, commentSearch]);

  const sortedDetailItems = useMemo(() => {
    const sorted = [...filteredDetailItems];
    sorted.sort((a, b) => {
      if (sortBy === "CONF_DESC") {
        return confidenceOf(b) - confidenceOf(a);
      }
      if (sortBy === "CONF_ASC") {
        return confidenceOf(a) - confidenceOf(b);
      }
      const aTime = parsePublishedAt(a.published_at);
      const bTime = parsePublishedAt(b.published_at);
      if (aTime === null && bTime === null) {
        return 0;
      }
      if (aTime === null) {
        return 1;
      }
      if (bTime === null) {
        return -1;
      }
      return sortBy === "NEWEST" ? bTime - aTime : aTime - bTime;
    });
    return sorted;
  }, [filteredDetailItems, sortBy]);

  const counts = useMemo(() => {
    const value: Record<Label, number> = { NEG: 0, NEU: 0, POS: 0 };
    for (const item of detailItems) {
      value[item.label] += 1;
    }
    return value;
  }, [detailItems]);

  const hasSortableTimestamp = useMemo(
    () => detailItems.some((item) => parsePublishedAt(item.published_at) !== null),
    [detailItems]
  );

  useEffect(() => {
    if (!hasSortableTimestamp && (sortBy === "NEWEST" || sortBy === "OLDEST")) {
      setSortBy("CONF_DESC");
    }
  }, [hasSortableTimestamp, sortBy]);

  return (
    <PageLayout
      topBar={topBar}
      title="Analysis History"
      subtitle="View, search, reopen, and delete your saved analysis runs."
    >
      <form
        onSubmit={handleSearchSubmit}
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
          placeholder="Search by video title..."
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
          Search
        </button>
      </form>

      {loadingList ? <p style={{ color: theme.textSoft, margin: "0 0 12px" }}>Loading history...</p> : null}
      {actionMessage ? <p style={{ color: theme.positive, margin: "0 0 12px" }}>{actionMessage}</p> : null}
      {error ? <p style={{ color: theme.negative, margin: "0 0 12px" }}>{error}</p> : null}

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
            No history records found.
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
                gap: 10,
              }}
            >
              <div style={{ display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17 }}>{item.video_title || item.video_id}</h3>
                  <p style={{ margin: "4px 0 0", color: theme.textSoft, fontSize: 13 }}>{item.youtube_url}</p>
                  <p style={{ margin: "4px 0 0", color: theme.textSoft, fontSize: 13 }}>
                    Saved: {formatDateTime(item.created_at)}
                  </p>
                </div>
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt="Saved analysis thumbnail"
                    style={{
                      width: 140,
                      borderRadius: 10,
                      border: `1px solid ${theme.border}`,
                      objectFit: "cover",
                      aspectRatio: "16 / 9",
                    }}
                  />
                ) : null}
              </div>
              <p style={{ margin: 0, color: theme.textMain, fontWeight: 600, fontSize: 13 }}>
                Total: {item.total_comments} | NEG: {item.neg_count} | NEU: {item.neu_count} | POS: {item.pos_count}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => void handleOpen(item.id)}
                  disabled={loadingDetail}
                  style={{
                    height: 36,
                    border: "none",
                    borderRadius: 9,
                    padding: "0 12px",
                    background: theme.primary,
                    color: theme.surface,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(item.id)}
                  style={{
                    height: 36,
                    border: `1px solid ${theme.negative}`,
                    borderRadius: 9,
                    padding: "0 12px",
                    background: theme.surface,
                    color: theme.negative,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {selectedDetail ? (
        <section
          style={{
            marginTop: 20,
            borderTop: `1px solid ${theme.border}`,
            paddingTop: 20,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ margin: 0 }}>Saved Result</h2>
              <p style={{ margin: "6px 0 0", color: theme.textSoft }}>
                Video: {selectedDetail.video_title || selectedDetail.video_id}
              </p>
              <p style={{ margin: "4px 0 0", color: theme.textMain, fontWeight: 600 }}>
                Total: {detailItems.length} | NEG: {counts.NEG} | NEU: {counts.NEU} | POS: {counts.POS}
              </p>
            </div>
            <ExportCSV items={sortedDetailItems} filenamePrefix={selectedDetail.video_id || "history_result"} />
          </div>

          <StatsCharts counts={counts} total={detailItems.length} />

          <div
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              background: theme.backgroundAlt,
              padding: 10,
            }}
          >
            <Filters value={filter} onChange={setFilter} />
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              background: theme.backgroundAlt,
              padding: 12,
            }}
          >
            <label style={{ display: "grid", gap: 7 }}>
              <span style={{ fontWeight: 600, color: theme.textMain }}>Search comments or author</span>
              <input
                type="text"
                placeholder="Type to filter results..."
                value={commentSearch}
                onChange={(event) => setCommentSearch(event.target.value)}
                style={{
                  height: 42,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  padding: "0 12px",
                  fontSize: 14,
                  color: theme.textMain,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 7, maxWidth: 320 }}>
              <span style={{ fontWeight: 600, color: theme.textMain }}>Sort by</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortValue)}
                style={{
                  height: 42,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  padding: "0 10px",
                  color: theme.textMain,
                }}
              >
                <option value="CONF_DESC">Confidence (desc)</option>
                <option value="CONF_ASC">Confidence (asc)</option>
                {hasSortableTimestamp ? <option value="NEWEST">Newest</option> : null}
                {hasSortableTimestamp ? <option value="OLDEST">Oldest</option> : null}
              </select>
            </label>
          </div>

          <CommentTable items={sortedDetailItems} searchTerm={commentSearch} />
        </section>
      ) : null}
    </PageLayout>
  );
}
