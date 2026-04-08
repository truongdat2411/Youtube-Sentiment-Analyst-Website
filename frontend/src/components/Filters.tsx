import type { Label } from "../api";
import { theme } from "../theme";

type FilterValue = "ALL" | Label;

interface FiltersProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}

const options: FilterValue[] = ["ALL", "NEG", "NEU", "POS"];

export default function Filters({ value, onChange }: FiltersProps) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            style={{
              border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.border}`,
              borderRadius: 9999,
              padding: "7px 14px",
              cursor: "pointer",
              backgroundColor: active ? theme.primary : theme.surface,
              color: active ? theme.surface : theme.textSoft,
              fontSize: 13,
              fontWeight: 700,
              transition: "all 120ms ease",
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export type { FilterValue };
