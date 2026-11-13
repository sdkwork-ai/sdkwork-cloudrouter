import type { ReactNode } from 'react';

export interface PageHeaderProps {
  readonly title: string;
  readonly summary?: string;
  readonly action?: ReactNode;
}

/**
 * Full-bleed page/section header.
 *
 * The header spans the viewport width with square corners and keeps the
 * documented 0.9rem surface content inset (`APP_MOBILE_REACT_UI_SPEC.md`
 * section 5). Pages never assemble their own top chrome; this is the content
 * heading below the shell header.
 */
export function PageHeader({ title, summary, action }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-line bg-surface px-[0.9rem] pb-3.5 pt-4">
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold leading-tight tracking-tight text-ink">{title}</h2>
        {summary ? <p className="mt-1 text-[11px] leading-5 text-ink-subtle">{summary}</p> : null}
      </div>
      {action}
    </header>
  );
}
