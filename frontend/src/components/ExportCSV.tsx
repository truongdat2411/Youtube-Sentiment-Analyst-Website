import type { AnalyzeItem } from "../api";
import { theme } from "../theme";

interface ExportCSVProps {
  items: AnalyzeItem[];
  filenamePrefix?: string;
}

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function ExportCSV({ items, filenamePrefix = "sentiment_results" }: ExportCSVProps) {
  const handleExport = () => {
    const headers = ["comment_id", "author", "published_at", "text", "label", "NEG", "NEU", "POS"];
    const rows = items.map((item) => [
      item.comment_id,
      item.author,
      item.published_at,
      item.text,
      item.label,
      String(item.probs.NEG),
      String(item.probs.NEU),
      String(item.probs.POS),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((value) => escapeCsv(value)).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenamePrefix}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      disabled={items.length === 0}
      onClick={handleExport}
      style={{
        height: 40,
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        padding: "0 13px",
        background: items.length === 0 ? theme.background : theme.surface,
        color: theme.textMain,
        fontWeight: 600,
        cursor: items.length === 0 ? "not-allowed" : "pointer",
      }}
    >
      Export CSV
    </button>
  );
}
