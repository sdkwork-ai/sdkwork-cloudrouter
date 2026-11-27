import type { HTMLAttributes, ReactNode, Ref } from 'react';

type DataAttributes = Record<`data-${string}`, string | number | boolean | undefined>;

export interface AdminTableShellProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
  viewportClassName?: string;
  viewportProps?: HTMLAttributes<HTMLDivElement> & DataAttributes;
  /**
   * Handle on the scroll viewport.
   *
   * A paged list resets `scrollTop` here when the page changes, so a new page
   * starts at its first row instead of inheriting the middle-of-the-table scroll
   * offset of the page the operator just left.
   */
  viewportRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

export function AdminTableShell({
  header,
  footer,
  viewportClassName = '',
  viewportProps,
  viewportRef,
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
        ref={viewportRef}
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
