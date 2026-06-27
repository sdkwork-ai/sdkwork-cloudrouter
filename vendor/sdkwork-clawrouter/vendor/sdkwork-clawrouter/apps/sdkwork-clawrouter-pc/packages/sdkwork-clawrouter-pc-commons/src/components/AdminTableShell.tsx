import type { HTMLAttributes, ReactNode } from 'react';

type DataAttributes = Record<`data-${string}`, string | number | boolean | undefined>;

export interface AdminTableShellProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
  viewportClassName?: string;
  viewportProps?: HTMLAttributes<HTMLDivElement> & DataAttributes;
  children: ReactNode;
}

export function AdminTableShell({
  header,
  footer,
  viewportClassName = '',
  viewportProps,
  children,
  className = '',
  ...props
}: AdminTableShellProps) {
  const { className: viewportPropsClassName = '', ...restViewportProps } = viewportProps ?? {};

  return (
    <div
      className={`flex min-h-0 flex-1 overflow-hidden min-w-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171717] ${className}`.trim()}
      {...props}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      <div
        data-admin-table-shell-viewport
        className={`min-h-0 flex-1 overflow-auto ${viewportClassName} ${viewportPropsClassName}`.trim()}
        {...restViewportProps}
      >
        {children}
      </div>
      {footer ? (
        <div data-admin-table-shell-footer className="shrink-0">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
