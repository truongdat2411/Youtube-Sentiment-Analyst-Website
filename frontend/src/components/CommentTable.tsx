import { useEffect, useState, type ReactNode } from "react";

import type { AnalyzeItem, Label } from "../api";
import { sentimentPillStyles, theme } from "../theme";

interface CommentTableProps {
  items: AnalyzeItem[];
  searchTerm: string;
}

const badgeStyles: Record<Label, { bg: string; fg: string }> = sentimentPillStyles;
const MOBILE_BREAKPOINT_PX = 768;
const COMMENT_PREVIEW_LENGTH = 180;

interface ExpandableCommentTextProps {
  text: string;
  highlightText: (value: string) => ReactNode;
}

function safeNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLabel(value: unknown): Label {
  const label = typeof value === "string" ? value.toUpperCase() : "";
  if (label === "NEG" || label === "NEU" || label === "POS") {
    return label;
  }
  return "NEU";
}

function confidenceOf(item: AnalyzeItem): number {
  return Math.max(safeNumber(item.probs?.NEG), safeNumber(item.probs?.NEU), safeNumber(item.probs?.POS));
}

function useIsSmallScreen(): boolean {
  const [isSmallScreen, setIsSmallScreen] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);
    const updateIsSmallScreen = () => {
      setIsSmallScreen(mediaQuery.matches);
    };

    updateIsSmallScreen();
    mediaQuery.addEventListener("change", updateIsSmallScreen);
    return () => {
      mediaQuery.removeEventListener("change", updateIsSmallScreen);
    };
  }, []);

  return isSmallScreen;
}

function ExpandableCommentText({ text, highlightText }: ExpandableCommentTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongComment = text.length > COMMENT_PREVIEW_LENGTH;
  const displayText =
    isExpanded || !isLongComment ? text : `${text.slice(0, COMMENT_PREVIEW_LENGTH).trimEnd()}...`;

  return (
    <div>
      <div>{highlightText(displayText)}</div>
      {isLongComment ? (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          style={{
            marginTop: 6,
            border: "none",
            background: "transparent",
            color: theme.primary,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            padding: 0,
          }}
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

export default function CommentTable({ items, searchTerm }: CommentTableProps) {
  console.info("[comment-table] received row count", items.length);
  const isSmallScreen = useIsSmallScreen();
  const [hoveredRowKey, setHoveredRowKey] = useState<string | null>(null);
  const normalizedSearch = searchTerm.trim();

  const highlightText = (text: string): ReactNode => {
    if (!normalizedSearch) {
      return text;
    }
    const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedSearch})`, "ig");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <mark
          key={`${part}-${index}`}
          style={{ backgroundColor: theme.neutralBg, padding: 0, borderRadius: 2 }}
        >
          {part}
        </mark>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    );
  };

  if (items.length === 0) {
    console.info("[comment-table] render path: empty");
    return (
      <p
        style={{
          margin: 0,
          padding: "14px 12px",
          border: `1px dashed ${theme.border}`,
          borderRadius: 12,
          color: theme.textSoft,
          background: theme.background,
        }}
      >
        No comments to display.
      </p>
    );
  }

  if (isSmallScreen) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item, index) => {
          const label = normalizeLabel(item.label);
          const neg = safeNumber(item.probs?.NEG);
          const neu = safeNumber(item.probs?.NEU);
          const pos = safeNumber(item.probs?.POS);
          const text = typeof item.text === "string" ? item.text : "";
          const author = typeof item.author === "string" ? item.author : "";
          const publishedAt = typeof item.published_at === "string" ? item.published_at : "";
          const rowKey =
            typeof item.comment_id === "string" && item.comment_id.trim() !== ""
              ? item.comment_id
              : `${author}-${publishedAt}-${index}`;

          return (
            <article
              key={rowKey}
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                padding: 13,
                background: theme.surface,
                boxShadow: "0 6px 16px rgba(17, 24, 39, 0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 9999,
                    fontWeight: 600,
                    fontSize: 12,
                    backgroundColor: badgeStyles[label].bg,
                    color: badgeStyles[label].fg,
                  }}
                >
                  {label}
                </span>
                <span style={{ color: theme.textMain, fontWeight: 600, fontSize: 13 }}>
                  {(confidenceOf(item) * 100).toFixed(1)}%
                </span>
              </div>

              <p style={{ margin: "8px 0 0", color: theme.textSoft, fontSize: 13 }}>
                Probs: {neg.toFixed(3)} / {neu.toFixed(3)} / {pos.toFixed(3)}
              </p>
              <p style={{ margin: "6px 0 0", color: theme.textSoft, fontSize: 13 }}>
                Author: {author || "-"}
              </p>
              {publishedAt ? (
                <p style={{ margin: "4px 0 0", color: theme.textSoft, fontSize: 12 }}>
                  Published: {publishedAt}
                </p>
              ) : null}

              <div style={{ marginTop: 10, lineHeight: 1.5 }}>
                <ExpandableCommentText text={text} highlightText={highlightText} />
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        overflowX: "auto",
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        background: theme.surface,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
        <thead>
          <tr
            style={{
              borderBottom: `1px solid ${theme.border}`,
              textAlign: "left",
              background: theme.background,
            }}
          >
            <th style={{ padding: "11px 10px", fontSize: 13, color: theme.textSoft }}>Label</th>
            <th style={{ padding: "11px 10px", fontSize: 13, color: theme.textSoft }}>Confidence</th>
            <th style={{ padding: "11px 10px", fontSize: 13, color: theme.textSoft }}>
              Probs (NEG/NEU/POS)
            </th>
            <th style={{ padding: "11px 10px", fontSize: 13, color: theme.textSoft }}>Comment</th>
            <th style={{ padding: "11px 10px", fontSize: 13, color: theme.textSoft }}>Author</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const label = normalizeLabel(item.label);
            const neg = safeNumber(item.probs?.NEG);
            const neu = safeNumber(item.probs?.NEU);
            const pos = safeNumber(item.probs?.POS);
            const text = typeof item.text === "string" ? item.text : "";
            const author = typeof item.author === "string" ? item.author : "";
            const rowKey =
              typeof item.comment_id === "string" && item.comment_id.trim() !== ""
                ? item.comment_id
                : `${author}-${item.published_at}-${index}`;
            const rowBackground =
              hoveredRowKey === rowKey
                ? theme.background
                : index % 2 === 0
                  ? theme.surface
                  : theme.background;

            return (
              <tr
                key={rowKey}
                onMouseEnter={() => setHoveredRowKey(rowKey)}
                onMouseLeave={() => setHoveredRowKey(null)}
                style={{
                  borderBottom: `1px solid ${theme.border}`,
                  background: rowBackground,
                  transition: "background-color 120ms ease",
                }}
              >
                <td style={{ padding: "11px 10px" }}>
                  <span
                    style={{
                      padding: "4px 11px",
                      borderRadius: 9999,
                      fontWeight: 700,
                      fontSize: 12,
                      backgroundColor: badgeStyles[label].bg,
                      color: badgeStyles[label].fg,
                    }}
                  >
                    {label}
                  </span>
                </td>
                <td style={{ padding: "11px 10px", color: theme.textMain, fontWeight: 700 }}>
                  {(confidenceOf(item) * 100).toFixed(1)}%
                </td>
                <td style={{ padding: "11px 10px", whiteSpace: "nowrap", color: theme.textSoft }}>
                  {neg.toFixed(3)} / {neu.toFixed(3)} / {pos.toFixed(3)}
                </td>
                <td style={{ padding: "11px 10px", color: theme.textMain }}>
                  <ExpandableCommentText text={text} highlightText={highlightText} />
                </td>
                <td style={{ padding: "11px 10px", whiteSpace: "nowrap", color: theme.textSoft }}>
                  {author || "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
