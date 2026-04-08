import type { Label } from "../api";
import { sentimentPillStyles, theme } from "../theme";

interface StatsChartsProps {
  counts: Record<Label, number>;
  total: number;
}

const SENTIMENT_ORDER: Label[] = ["NEG", "NEU", "POS"];

function percentage(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return (value / total) * 100;
}

export default function StatsCharts({ counts, total }: StatsChartsProps) {
  const donutSize = 176;
  const strokeWidth = 22;
  const radius = (donutSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;
  const maxCount = Math.max(...SENTIMENT_ORDER.map((label) => counts[label]), 1);

  return (
    <div
      style={{
        display: "grid",
        gap: 14,
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      }}
    >
      <article
        className="chart-card"
        style={{
          border: `1px solid ${theme.border}`,
          borderRadius: 14,
          background: theme.surface,
          padding: 14,
        }}
      >
        <h4 style={{ margin: "0 0 10px", fontSize: 15, color: theme.textMain, fontWeight: 800 }}>
          Sentiment Distribution
        </h4>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <svg
            data-testid="sentiment-donut-chart"
            width={donutSize}
            height={donutSize}
            viewBox={`0 0 ${donutSize} ${donutSize}`}
            aria-label="Sentiment donut chart"
          >
            <circle
              cx={donutSize / 2}
              cy={donutSize / 2}
              r={radius}
              fill="none"
              stroke={theme.border}
              strokeWidth={strokeWidth}
            />
            {SENTIMENT_ORDER.map((label) => {
              const count = counts[label];
              const segmentLength = total > 0 ? (count / total) * circumference : 0;
              const strokeDasharray = `${segmentLength} ${circumference}`;
              const style = sentimentPillStyles[label];
              const currentOffset = cumulativeOffset;
              cumulativeOffset += segmentLength;

              return (
                <circle
                  key={label}
                  cx={donutSize / 2}
                  cy={donutSize / 2}
                  r={radius}
                  fill="none"
                  stroke={style.fg}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={-currentOffset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${donutSize / 2} ${donutSize / 2})`}
                />
              );
            })}
          </svg>
          <div style={{ display: "grid", gap: 8 }}>
            {SENTIMENT_ORDER.map((label) => {
              const count = counts[label];
              const share = percentage(count, total);
              const style = sentimentPillStyles[label];
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      minWidth: 44,
                      borderRadius: 999,
                      padding: "4px 8px",
                      background: style.bg,
                      color: style.fg,
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {label}
                  </span>
                  <span style={{ color: theme.textMain, fontWeight: 700, fontSize: 13 }}>{count}</span>
                  <span style={{ color: theme.textSoft, fontSize: 13 }}>
                    ({share.toFixed(1)}
                    %)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </article>

      <article
        className="chart-card"
        style={{
          border: `1px solid ${theme.border}`,
          borderRadius: 14,
          background: theme.surface,
          padding: 14,
        }}
      >
        <h4 style={{ margin: "0 0 10px", fontSize: 15, color: theme.textMain, fontWeight: 800 }}>
          Sentiment Counts
        </h4>
        <div data-testid="sentiment-bar-chart" style={{ display: "grid", gap: 10 }}>
          {SENTIMENT_ORDER.map((label) => {
            const count = counts[label];
            const style = sentimentPillStyles[label];
            const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return (
              <div key={label} style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 8 }}>
                <span style={{ color: style.fg, fontWeight: 700, fontSize: 12 }}>{label}</span>
                <div
                  style={{
                    alignSelf: "center",
                    height: 12,
                    borderRadius: 999,
                    background: theme.background,
                    border: `1px solid ${theme.border}`,
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="bar-fill"
                    style={{
                      width: `${widthPercent}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: style.fg,
                    }}
                  />
                </div>
                <span style={{ color: theme.textMain, fontWeight: 700, fontSize: 13 }}>{count}</span>
              </div>
            );
          })}
        </div>
      </article>
    </div>
  );
}
