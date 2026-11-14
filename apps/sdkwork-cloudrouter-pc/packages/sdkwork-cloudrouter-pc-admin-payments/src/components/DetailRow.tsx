/**
 * Label/value row shared by the payment record detail drawers.
 *
 * Values are monospace and break-all: ids and trade numbers are long opaque
 * strings that must never be silently truncated in an investigation view.
 */
export function DetailRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-50 py-2 text-sm dark:border-white/5">
      <span className="shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
      <span className="break-all text-right font-mono text-xs text-slate-900 dark:text-white">
        {value === null || value === undefined || value === '' ? '-' : String(value)}
      </span>
    </div>
  );
}
