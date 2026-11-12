import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

/**
 * Presentation primitives for the Smart Hardware Center.
 *
 * The admin shell owns page chrome (header, sidebar, content viewport), so these
 * stay local to the module: they encode the console's visual system once
 * (spacing, tone, focus ring, dark-mode pairs) and every hardware page composes
 * them instead of restating Tailwind classes. No primitive renders user copy:
 * every label arrives as a prop, already localized by the caller.
 */

export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter((value): value is string => Boolean(value)).join(' ');
}

export const CONTROL_CLASS =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-lobster-400 focus:ring-2 focus:ring-lobster-400/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-white/10 dark:bg-[#202020] dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-white/5';

export const PRIMARY_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-lobster-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-lobster-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-[#0f1115]';

export const SECONDARY_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-lobster-300 hover:text-lobster-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300 dark:focus-visible:ring-offset-[#0f1115]';

export const DANGER_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 dark:focus-visible:ring-offset-[#0f1115]';

export type BadgeTone = 'danger' | 'info' | 'neutral' | 'success' | 'warning';

const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  danger:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
  info:
    'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300',
  neutral:
    'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  warning:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5',
        BADGE_TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageShell({
  actions,
  children,
  description,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4 overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function SectionCard({
  actions,
  children,
  className,
  description,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  title?: string;
}) {
  return (
    <section
      className={cx(
        'flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171717]',
        className,
      )}
    >
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/5">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function KpiCard({
  detail,
  icon,
  label,
  tone = 'neutral',
  value,
}: {
  detail?: string;
  icon?: ReactNode;
  label: string;
  tone?: BadgeTone;
  value: string;
}) {
  const accent: Record<BadgeTone, string> = {
    danger: 'text-red-600 dark:text-red-400',
    info: 'text-sky-600 dark:text-sky-400',
    neutral: 'text-slate-900 dark:text-white',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
  };
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171717]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </span>
        {icon ? <span className="text-slate-400 dark:text-slate-500">{icon}</span> : null}
      </div>
      <span className={cx('text-2xl font-bold tabular-nums', accent[tone])}>{value}</span>
      {detail ? (
        <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">{detail}</span>
      ) : null}
    </div>
  );
}

export function PrimaryButton({
  children,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={cx(PRIMARY_BUTTON_CLASS, className)} {...props}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={cx(SECONDARY_BUTTON_CLASS, className)} {...props}>
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={cx(DANGER_BUTTON_CLASS, className)} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-sky-400 dark:hover:bg-sky-500/10',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-[#171717]">
      {children}
    </div>
  );
}

export function Field({
  children,
  error,
  hint,
  htmlFor,
  label,
  required = false,
}: {
  children: ReactNode;
  error?: string;
  hint?: string;
  htmlFor?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200"
      >
        {label}
        {required ? <span aria-hidden="true" className="ml-1 text-red-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(CONTROL_CLASS, className)} {...props} />;
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(CONTROL_CLASS, 'min-h-24 font-mono text-xs leading-5', className)}
      {...props}
    />
  );
}

export function SelectInput({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(CONTROL_CLASS, 'pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function ToggleInput({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-[#171717]',
        checked ? 'bg-lobster-600' : 'bg-slate-300 dark:bg-white/20',
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export function NoticeBanner({
  children,
  onDismiss,
  tone = 'info',
  dismissLabel,
}: {
  children: ReactNode;
  dismissLabel?: string;
  onDismiss?: () => void;
  tone?: BadgeTone;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx(
        'flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-xs leading-5',
        BADGE_TONE_CLASS[tone],
      )}
    >
      <div className="min-w-0 flex-1 whitespace-pre-wrap break-words">{children}</div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded px-1.5 text-[11px] font-semibold opacity-70 transition-opacity hover:opacity-100"
        >
          {dismissLabel ?? ''}
        </button>
      ) : null}
    </div>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 px-4 py-10">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
      />
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}

export function EmptyBlock({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {description ? (
        <p className="max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function ErrorBlock({
  description,
  onRetry,
  retryLabel,
  title,
}: {
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  title: string;
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <p className="text-sm font-medium text-red-600 dark:text-red-400">{title}</p>
      {description ? (
        <p className="max-w-md whitespace-pre-wrap text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}
      {onRetry ? <SecondaryButton onClick={onRetry}>{retryLabel ?? ''}</SecondaryButton> : null}
    </div>
  );
}

export function Tabs<TId extends string>({
  activeId,
  items,
  label,
  onChange,
}: {
  activeId: TId;
  items: readonly { id: TId; label: string; count?: number }[];
  label: string;
  onChange: (id: TId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex min-w-0 flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-[#171717]"
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cx(
              'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              active
                ? 'bg-lobster-50 text-lobster-700 dark:bg-lobster-500/15 dark:text-lobster-300'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200',
            )}
          >
            {item.label}
            {item.count === undefined ? null : (
              <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Drawer({
  children,
  closeLabel,
  footer,
  onClose,
  subtitle,
  title,
}: {
  children: ReactNode;
  closeLabel: string;
  footer?: ReactNode;
  onClose: () => void;
  subtitle?: string;
  title: string;
}) {
  const titleId = useId();
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => previousFocus.current?.focus();
  }, []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-full w-full max-w-xl min-w-0 flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171717]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
          >
            {closeLabel}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-white/5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TableShell({
  children,
  footer,
  header,
}: {
  children: ReactNode;
  footer?: ReactNode;
  header?: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171717]">
      {header ? <div className="shrink-0">{header}</div> : null}
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </div>
  );
}

export function TableHeadCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cx(
        'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cx('px-4 py-2.5 align-middle text-xs', className)}>
      {children}
    </td>
  );
}

export function TableRow({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cx(
        'border-b border-slate-100 last:border-0 dark:border-white/5',
        onClick
          ? 'cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5'
          : 'transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.03]',
      )}
    >
      {children}
    </tr>
  );
}

export function DefinitionGrid({
  entries,
}: {
  entries: readonly { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry) => (
        <div key={entry.label} className="min-w-0">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {entry.label}
          </dt>
          <dd className="mt-0.5 break-words text-xs text-slate-800 dark:text-slate-100">
            {entry.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function JsonBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <pre className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-700 dark:border-white/10 dark:bg-black/30 dark:text-slate-200">
        {value || '-'}
      </pre>
    </div>
  );
}

interface ToastContextValue {
  notify: (message: string, tone?: BadgeTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Minimal in-page toast surface. Pages raise one-line outcomes here instead of
 * opening a modal for a successful mutation.
 */
export function HardwareToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: BadgeTone } | null>(null);
  const timerRef = useRef<number | null>(null);

  const notify = useCallback((message: string, tone: BadgeTone = 'success') => {
    setToast({ message, tone });
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] w-full max-w-md -translate-x-1/2 px-4">
          <div className="pointer-events-auto">
            <NoticeBanner tone={toast.tone}>{toast.message}</NoticeBanner>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useHardwareToast(): ToastContextValue {
  const context = useContext(ToastContext);
  return context ?? { notify: () => undefined };
}
