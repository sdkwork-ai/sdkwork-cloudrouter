import type { ReactNode } from "react";
import { Check, MessageCircle, X } from "lucide-react";

/**
 * A mutually exclusive set of review decisions.
 *
 * Publisher verification, listing moderation, and appeal adjudication all ask
 * the operator to pick exactly one outcome, so they share one control: a radio
 * group with an explicit tone (approve / reject / ask for changes) instead of
 * three look-alike buttons that differ only by their label. The tone drives the
 * icon and the selected colour, which is the only signal that stays readable
 * when the label is long.
 */
export interface AppCenterDecisionOption<T extends string> {
  value: T;
  label: string;
  /** Approving, rejecting, or a neutral request for more information. */
  tone: "positive" | "negative" | "neutral";
  /** Overrides the tone icon when the choice needs a more specific one. */
  icon?: ReactNode;
}

const toneIcon = {
  negative: X,
  neutral: MessageCircle,
  positive: Check,
} as const;

const toneActiveClassName = {
  negative: "border-[var(--sdk-color-state-danger)] text-[var(--sdk-color-state-danger)]",
  neutral: "border-[var(--sdk-color-border-focus)] text-[var(--sdk-color-brand-primary)]",
  positive: "border-[var(--sdk-color-state-success)] text-[var(--sdk-color-state-success)]",
} as const;

export function AppCenterDecisionGroup<T extends string>({
  columns = 3,
  label,
  onChange,
  options,
  value,
}: {
  columns?: 2 | 3;
  label: ReactNode;
  onChange: (value: T) => void;
  options: readonly AppCenterDecisionOption<T>[];
  value: T;
}) {
  const labelId = "app-center-decision-label";
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[var(--sdk-color-text-primary)]" id={labelId}>
        {label}
      </p>
      <div
        aria-labelledby={labelId}
        className={`grid gap-2 ${columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
        role="radiogroup"
      >
        {options.map((option) => {
          const active = option.value === value;
          const Icon = toneIcon[option.tone];
          return (
            <button
              aria-checked={active}
              className={[
                "flex items-center gap-2 rounded-[var(--sdk-radius-control)] border px-3 py-2 text-left text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)]",
                active
                  ? `bg-[var(--sdk-color-surface-panel-muted)] ${toneActiveClassName[option.tone]}`
                  : "border-[var(--sdk-color-border-default)] text-[var(--sdk-color-text-secondary)] hover:bg-[var(--sdk-color-surface-panel-muted)]",
              ].join(" ")}
              key={option.value}
              onClick={() => onChange(option.value)}
              role="radio"
              type="button"
            >
              {option.icon ?? <Icon className="h-4 w-4 shrink-0" />}
              <span className="min-w-0 truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
