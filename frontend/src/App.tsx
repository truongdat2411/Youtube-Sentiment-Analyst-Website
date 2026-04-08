import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { AnalyzeItem, AnalyzeResponse, Label } from "./api";
import coverImage from "./assets/anh_bia.jpg";
import logoImage from "./assets/logo.png";
import CommentTable from "./components/CommentTable";
import ExportCSV from "./components/ExportCSV";
import Filters, { FilterValue } from "./components/Filters";
import StatsCharts from "./components/StatsCharts";
import { theme } from "./theme";
import { isValidYouTubeUrl } from "./utils/youtube";

const MAX_COMMENT_OPTIONS = [50, 100, 200, 500];
const ANALYZE_TIMEOUT_MS = 90_000;
type SortValue = "CONF_DESC" | "CONF_ASC" | "NEWEST" | "OLDEST";
interface AppProps {
  accessToken?: string | null;
  topBar?: ReactNode;
  loginHint?: string | null;
}

type RawAnalyzeResponse = {
  video_id?: unknown;
  video_title?: unknown;
  items?: unknown;
  detail?: unknown;
};

function confidenceOf(item: AnalyzeItem): number {
  return Math.max(item.probs.NEG, item.probs.NEU, item.probs.POS);
}

function parsePublishedAt(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
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

function normalizeItem(value: unknown, index: number): AnalyzeItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const probsSource =
    item.probs && typeof item.probs === "object"
      ? (item.probs as Record<string, unknown>)
      : {};

  return {
    comment_id: safeString(item.comment_id) || `row-${index}`,
    author: safeString(item.author),
    published_at: safeString(item.published_at),
    text: safeString(item.text),
    label: normalizeLabel(item.label),
    probs: {
      NEG: safeNumber(probsSource.NEG),
      NEU: safeNumber(probsSource.NEU),
      POS: safeNumber(probsSource.POS),
    },
  };
}

function validateYouTubeUrlInput(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return "Please enter a YouTube URL.";
  }
  if (!isValidYouTubeUrl(trimmed)) {
    return "Please enter a valid YouTube link.";
  }
  return null;
}

function buildVideoThumbnailUrl(videoId: string): string | null {
  const normalizedVideoId = videoId.trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(normalizedVideoId)) {
    return null;
  }
  return `https://i.ytimg.com/vi/${normalizedVideoId}/hqdefault.jpg`;
}

export default function App({ accessToken = null, topBar, loginHint = null }: AppProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [urlTouched, setUrlTouched] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [maxComments, setMaxComments] = useState(200);
  const [items, setItems] = useState<AnalyzeItem[]>([]);
  const [videoId, setVideoId] = useState<string>("");
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [sortBy, setSortBy] = useState<SortValue>("CONF_DESC");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAnalyzeHovered, setIsAnalyzeHovered] = useState(false);
  const [videoThumbnailUnavailable, setVideoThumbnailUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    console.info("[analyze] loading state changed", loading);
  }, [loading]);

  useEffect(() => {
    console.info("[analyze] error state changed", error);
  }, [error]);

  useEffect(() => {
    setVideoThumbnailUnavailable(false);
  }, [videoId]);

  const trimmedYoutubeUrl = youtubeUrl.trim();
  const isUrlEmpty = trimmedYoutubeUrl.length === 0;
  const isUrlValid = !isUrlEmpty && isValidYouTubeUrl(trimmedYoutubeUrl);
  const analyzeDisabled = loading || isUrlEmpty || !isUrlValid;
  const hasUrlFieldError = Boolean(urlError);
  const showValidUrlState = !hasUrlFieldError && !isUrlEmpty && isUrlValid;
  const urlHelperMessage = urlError
    ? urlError
    : isUrlEmpty
      ? "Please enter a YouTube URL."
      : isUrlValid
        ? "URL looks good. Ready to analyze."
        : "Supported formats: watch, youtu.be, shorts, embed.";
  const videoThumbnailUrl = buildVideoThumbnailUrl(videoId);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const matchesLabel = filter === "ALL" ? true : item.label === filter;
      if (!matchesLabel) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const text = safeString(item.text).toLowerCase();
      const author = safeString(item.author).toLowerCase();
      return (
        text.includes(normalizedSearch) || author.includes(normalizedSearch)
      );
    });
  }, [filter, items, searchTerm]);

  const counts = useMemo(() => {
    const result: Record<Label, number> = { NEG: 0, NEU: 0, POS: 0 };
    for (const item of items) {
      if (item.label === "NEG" || item.label === "NEU" || item.label === "POS") {
        result[item.label] += 1;
      }
    }
    return result;
  }, [items]);

  const summaryStatCards = [
    {
      key: "TOTAL",
      label: "Total Comments",
      value: items.length,
      icon: "#",
      color: theme.primary,
      background: "rgba(79, 70, 229, 0.1)",
    },
    {
      key: "NEG",
      label: "Negative",
      value: counts.NEG,
      icon: "-",
      color: theme.negative,
      background: theme.negativeBg,
    },
    {
      key: "NEU",
      label: "Neutral",
      value: counts.NEU,
      icon: "=",
      color: theme.neutral,
      background: theme.neutralBg,
    },
    {
      key: "POS",
      label: "Positive",
      value: counts.POS,
      icon: "+",
      color: theme.positive,
      background: theme.positiveBg,
    },
  ];

  const hasSortableTimestamp = useMemo(
    () => items.some((item) => parsePublishedAt(safeString(item.published_at)) !== null),
    [items]
  );

  useEffect(() => {
    if (!hasSortableTimestamp && (sortBy === "NEWEST" || sortBy === "OLDEST")) {
      setSortBy("CONF_DESC");
    }
  }, [hasSortableTimestamp, sortBy]);

  const sortedFilteredItems = useMemo(() => {
    const sorted = [...filteredItems];
    sorted.sort((a, b) => {
      if (sortBy === "CONF_DESC") {
        return confidenceOf(b) - confidenceOf(a);
      }
      if (sortBy === "CONF_ASC") {
        return confidenceOf(a) - confidenceOf(b);
      }

      const aTime = parsePublishedAt(safeString(a.published_at));
      const bTime = parsePublishedAt(safeString(b.published_at));

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
  }, [filteredItems, sortBy]);

  const runAnalyze = async (
    payload: { youtube_url: string; max_comments: number },
    signal: AbortSignal
  ): Promise<AnalyzeResponse> => {
    const startedAt = performance.now();
    console.info("[analyze] request started", {
      youtube_url: payload.youtube_url,
      max_comments: payload.max_comments,
    });

    const timeoutController = new AbortController();
    const timeoutHandle = window.setTimeout(() => {
      timeoutController.abort();
    }, ANALYZE_TIMEOUT_MS);

    const handleCallerAbort = () => {
      timeoutController.abort();
    };
    signal.addEventListener("abort", handleCallerAbort, { once: true });

    try {
      const response = await fetch("http://localhost:8000/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: timeoutController.signal,
      });

      const elapsedMs = Math.round(performance.now() - startedAt);
      console.info("[analyze] response received", { status: response.status, elapsed_ms: elapsedMs });
      const rawResponse = (await response.json().catch(() => ({}))) as RawAnalyzeResponse;
      console.info("[analyze] raw response received", rawResponse);
      console.info(
        "[analyze] response keys",
        rawResponse && typeof rawResponse === "object" ? Object.keys(rawResponse) : []
      );

      if (!response.ok) {
        const message = rawResponse?.detail ?? "Analyze request failed.";
        throw new Error(String(message));
      }

      return rawResponse as AnalyzeResponse;
    } catch (err) {
      if (timeoutController.signal.aborted && !signal.aborted) {
        throw new Error(`Analyze request timed out after ${Math.round(ANALYZE_TIMEOUT_MS / 1000)}s.`);
      }
      throw err;
    } finally {
      window.clearTimeout(timeoutHandle);
      signal.removeEventListener("abort", handleCallerAbort);
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleYoutubeUrlChange = (value: string) => {
    setYoutubeUrl(value);
    if (urlTouched) {
      setUrlError(validateYouTubeUrlInput(value));
    }
  };

  const handleYoutubeUrlBlur = () => {
    setUrlTouched(true);
    setUrlError(validateYouTubeUrlInput(youtubeUrl));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) {
      return;
    }

    setUrlTouched(true);
    const trimmedUrl = youtubeUrl.trim();
    const validationMessage = validateYouTubeUrlInput(trimmedUrl);
    setUrlError(validationMessage);
    console.info("[analyze] submitted URL", trimmedUrl);
    if (validationMessage) {
      return;
    }
    if (trimmedUrl !== youtubeUrl) {
      setYoutubeUrl(trimmedUrl);
    }

    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setInfo(null);
    setUrlError(null);
    console.info("[analyze] submitted", { youtube_url: trimmedUrl, max_comments: maxComments });

    try {
      const response = await runAnalyze(
        {
          youtube_url: trimmedUrl,
          max_comments: maxComments,
        },
        controller.signal
      );
      if (!isMountedRef.current || activeRequestIdRef.current !== requestId || controller.signal.aborted) {
        return;
      }
      const rawResponse = response as RawAnalyzeResponse;
      const rawItems = Array.isArray(rawResponse.items) ? rawResponse.items : [];
      console.info("[analyze] items length before normalization", rawItems.length);
      const normalizedItems = rawItems
        .map((item, index) => normalizeItem(item, index))
        .filter((item): item is AnalyzeItem => item !== null);
      console.info("[analyze] normalized rows length", normalizedItems.length);
      setItems(normalizedItems);
      setVideoId(safeString(rawResponse.video_id));
      setVideoTitle(typeof rawResponse.video_title === "string" ? rawResponse.video_title : null);
      setFilter("ALL");
      setSearchTerm("");
      setError(null);
      setInfo(null);
    } catch (err) {
      if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
        return;
      }
      if (controller.signal.aborted) {
        setError(null);
        setInfo("Cancelled");
      } else {
        const message = err instanceof Error ? err.message : "Unexpected error.";
        console.error("[analyze] error", message);
        setError(message);
        setInfo(null);
      }
    } finally {
      if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
        return;
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading(false);
    }
  };

  console.info("[analyze] state value right before render", {
    loading,
    error,
    items_length: items.length,
    rows_length: sortedFilteredItems.length,
    filter,
    sortBy,
    searchTerm,
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${theme.pageBgTop} 0%, ${theme.pageBgBottom} 100%)`,
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .results-enter {
          animation: fadeInUp 420ms ease both;
        }

        .stats-enter {
          animation: fadeInUp 520ms ease both;
        }

        .stat-card {
          transition: transform 160ms ease, box-shadow 180ms ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(17, 24, 39, 0.08);
        }

        .thumbnail-card {
          transition: transform 160ms ease, box-shadow 180ms ease;
        }

        .thumbnail-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(17, 24, 39, 0.11);
        }

        .chart-card {
          transition: transform 160ms ease, box-shadow 180ms ease;
        }

        .chart-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 22px rgba(17, 24, 39, 0.08);
        }

        .bar-fill {
          transition: width 640ms ease;
        }
      `}</style>
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "36px 16px 54px",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
          color: theme.textMain,
        }}
      >
        {topBar ? <div style={{ marginBottom: 16 }}>{topBar}</div> : null}
        <header
          style={{
            marginBottom: 22,
            border: `1px solid ${theme.border}`,
            borderRadius: 22,
            overflow: "hidden",
            boxShadow: theme.shadow,
            minHeight: "clamp(260px, 35vw, 340px)",
            display: "flex",
            alignItems: "flex-end",
            backgroundImage: `linear-gradient(115deg, rgba(15, 23, 42, 0.72) 0%, rgba(30, 41, 59, 0.5) 62%, rgba(30, 41, 59, 0.34) 100%), url(${coverImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
          }}
        >
          <div style={{ padding: "28px 26px 30px", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 15, flexWrap: "wrap" }}>
              <img
                src={logoImage}
                alt="YouTube sentiment app logo"
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  objectFit: "cover",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  background: "rgba(255, 255, 255, 0.14)",
                }}
              />
              <div style={{ maxWidth: 760 }}>
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255, 255, 255, 0.85)",
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Sentiment Intelligence
                </p>
                <h1
                  style={{
                    margin: "5px 0 0",
                    fontSize: "clamp(30px, 4vw, 40px)",
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                    color: theme.surface,
                  }}
                >
                  YouTube Comment Sentiment
                </h1>
                <p
                  style={{
                    marginTop: 11,
                    marginBottom: 0,
                    color: "rgba(255, 255, 255, 0.88)",
                    fontSize: "clamp(14px, 1.9vw, 16px)",
                    maxWidth: 620,
                  }}
                >
                  Analyze comment tone quickly with clear NEG / NEU / POS insights.
                </p>
              </div>
            </div>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: 18,
            padding: 20,
            display: "grid",
            gap: 14,
            background: theme.surface,
            boxShadow: theme.shadow,
          }}
        >
          <label style={{ display: "grid", gap: 7 }}>
            <span style={{ fontWeight: 600, color: theme.textMain }}>YouTube URL</span>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(event) => handleYoutubeUrlChange(event.target.value)}
              onBlur={handleYoutubeUrlBlur}
              disabled={loading}
              aria-invalid={hasUrlFieldError}
              style={{
                height: 44,
                border: hasUrlFieldError
                  ? `1px solid ${theme.negative}`
                  : showValidUrlState
                    ? `1px solid ${theme.positive}`
                    : `1px solid ${theme.border}`,
                borderRadius: 10,
                padding: "0 12px",
                fontSize: 14,
                background: loading ? theme.background : theme.surface,
                color: theme.textMain,
                outline: "none",
                transition: "border-color 120ms ease",
              }}
            />
            <span
              style={{
                fontSize: 13,
                color: hasUrlFieldError
                  ? theme.negative
                  : showValidUrlState
                    ? theme.positive
                    : theme.textSoft,
              }}
            >
              {urlHelperMessage}
            </span>
          </label>

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <label style={{ display: "grid", gap: 7 }}>
              <span style={{ fontWeight: 600, color: theme.textMain }}>Max comments</span>
              <select
                value={maxComments}
                onChange={(event) => setMaxComments(Number(event.target.value))}
                disabled={loading}
                style={{
                  height: 44,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  padding: "0 10px",
                  minWidth: 144,
                  background: theme.surface,
                  color: theme.textMain,
                }}
              >
                {MAX_COMMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={analyzeDisabled}
              onMouseEnter={() => setIsAnalyzeHovered(true)}
              onMouseLeave={() => setIsAnalyzeHovered(false)}
              style={{
                height: 44,
                border: "none",
                borderRadius: 10,
                padding: "0 18px",
                backgroundColor: analyzeDisabled
                  ? "rgba(79, 70, 229, 0.45)"
                  : isAnalyzeHovered
                    ? theme.primaryHover
                    : theme.primary,
                color: theme.surface,
                fontWeight: 700,
                cursor: analyzeDisabled ? "not-allowed" : "pointer",
                boxShadow: analyzeDisabled ? "none" : "0 6px 16px rgba(79, 70, 229, 0.24)",
                transition: "background-color 120ms ease, box-shadow 120ms ease",
              }}
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>
            {loading ? (
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  height: 44,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  padding: "0 18px",
                  backgroundColor: theme.surface,
                  color: theme.textMain,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        {loginHint ? (
          <p
            style={{
              marginTop: 14,
              border: `1px solid ${theme.border}`,
              background: theme.backgroundAlt,
              color: theme.textSoft,
              borderRadius: 10,
              padding: "11px 12px",
            }}
          >
            {loginHint}
          </p>
        ) : null}

        {loading ? (
          <div
            style={{
              marginTop: 14,
              border: `1px solid ${theme.border}`,
              background: "rgba(79, 70, 229, 0.09)",
              color: theme.primary,
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <span>Analyzing comments... Please wait.</span>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <div
                style={{ height: 12, width: "100%", borderRadius: 6, background: "rgba(79, 70, 229, 0.17)" }}
              />
              <div
                style={{ height: 12, width: "95%", borderRadius: 6, background: "rgba(79, 70, 229, 0.17)" }}
              />
              <div
                style={{ height: 12, width: "92%", borderRadius: 6, background: "rgba(79, 70, 229, 0.17)" }}
              />
            </div>
          </div>
        ) : null}

        {info ? (
          <p
            style={{
              marginTop: 14,
              border: `1px solid ${theme.border}`,
              background: "rgba(79, 70, 229, 0.09)",
              color: theme.primary,
              borderRadius: 10,
              padding: "11px 12px",
            }}
          >
            {info}
          </p>
        ) : null}

        {error ? (
          <p
            style={{
              marginTop: 14,
              border: `1px solid ${theme.negative}`,
              background: theme.negativeBg,
              color: theme.negative,
              borderRadius: 10,
              padding: "11px 12px",
            }}
          >
            {error}
          </p>
        ) : null}

        <section
          className={items.length > 0 ? "results-enter" : undefined}
          style={{
            marginTop: 18,
            border: `1px solid ${theme.border}`,
            borderRadius: 18,
            padding: 22,
            background: theme.surface,
            boxShadow: theme.shadow,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.2 }}>Results</h2>
              <p style={{ margin: "8px 0 0", color: theme.textSoft }}>
                Video: {videoTitle || videoId || "-"}
              </p>
              <p style={{ margin: "6px 0 0", color: theme.textMain, fontWeight: 600 }}>
                Total: {items.length} | NEG: {counts.NEG} | NEU: {counts.NEU} | POS: {counts.POS}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "5px 10px",
                    background: "rgba(79, 70, 229, 0.09)",
                    color: theme.primary,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Total {items.length}
                </span>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "5px 10px",
                    background: theme.negativeBg,
                    color: theme.negative,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  NEG {counts.NEG}
                </span>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "5px 10px",
                    background: theme.neutralBg,
                    color: theme.neutral,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  NEU {counts.NEU}
                </span>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "5px 10px",
                    background: theme.positiveBg,
                    color: theme.positive,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  POS {counts.POS}
                </span>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gap: 12,
                justifyItems: "end",
                opacity: loading ? 0.6 : 1,
                pointerEvents: loading ? "none" : "auto",
              }}
            >
              <ExportCSV items={sortedFilteredItems} filenamePrefix={videoId || "sentiment_results"} />
              {videoThumbnailUrl && !videoThumbnailUnavailable ? (
                <div
                  className="thumbnail-card"
                  style={{
                    width: 252,
                    maxWidth: "100%",
                    borderRadius: 12,
                    border: `1px solid ${theme.border}`,
                    background: theme.surface,
                    overflow: "hidden",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      padding: "8px 10px",
                      fontSize: 12,
                      color: theme.textSoft,
                      background: theme.background,
                    }}
                  >
                    Video Preview
                  </p>
                  <img
                    src={videoThumbnailUrl}
                    alt="Video thumbnail"
                    loading="lazy"
                    onError={() => setVideoThumbnailUnavailable(true)}
                    style={{
                      width: "100%",
                      aspectRatio: "16 / 9",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {items.length > 0 ? (
            <div
              className="stats-enter"
              style={{
                marginTop: 16,
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                background: theme.backgroundAlt,
                padding: 16,
              }}
            >
              <h3 style={{ margin: "0 0 4px", fontSize: 19 }}>Statistics</h3>
              <p style={{ margin: "0 0 12px", color: theme.textSoft, fontSize: 13 }}>
                Distribution and count breakdown from analyzed comments.
              </p>
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginBottom: 12,
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                }}
              >
                {summaryStatCards.map((card) => (
                  <article
                    key={card.key}
                    className="stat-card"
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${theme.border}`,
                      background: card.background,
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 800,
                          color: card.color,
                          background: theme.surface,
                          border: `1px solid ${theme.border}`,
                        }}
                      >
                        {card.icon}
                      </span>
                      <span style={{ color: theme.textSoft, fontSize: 12, fontWeight: 700 }}>
                        {card.label}
                      </span>
                    </div>
                    <p style={{ margin: "7px 0 0", color: card.color, fontSize: 22, fontWeight: 800 }}>
                      {card.value}
                    </p>
                  </article>
                ))}
              </div>
              <StatsCharts counts={counts} total={items.length} />
            </div>
          ) : null}

          <div
            style={{
              marginTop: 14,
              marginBottom: 14,
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              background: theme.backgroundAlt,
              padding: 10,
              opacity: loading ? 0.6 : 1,
              pointerEvents: loading ? "none" : "auto",
            }}
          >
            <Filters value={filter} onChange={setFilter} />
          </div>

          <div
            style={{
              marginBottom: 14,
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              background: theme.backgroundAlt,
              padding: 12,
              opacity: loading ? 0.6 : 1,
              pointerEvents: loading ? "none" : "auto",
            }}
          >
            <label style={{ display: "grid", gap: 7 }}>
              <span style={{ fontWeight: 600, color: theme.textMain }}>Search comments or author</span>
              <input
                type="text"
                placeholder="Type to filter results..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                disabled={loading}
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
                disabled={loading}
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

          <CommentTable items={sortedFilteredItems} searchTerm={searchTerm} />
        </section>
      </div>
    </main>
  );
}
