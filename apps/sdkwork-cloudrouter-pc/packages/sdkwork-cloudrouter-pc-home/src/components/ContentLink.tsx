import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Renders an operator-configured call to action.
 *
 * The href comes from the console, so it can be either an in-app route (`/console`, what the shipped
 * defaults use) or an absolute URL (a sales site, a docs portal). React Router's `Link` only handles
 * the former — pointing it at `https://…` produces a broken in-app navigation — so the two are
 * dispatched here instead of leaving every caller to remember the distinction.
 */
export function ContentLink({
  children,
  className,
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  if (/^https?:\/\//iu.test(href)) {
    return (
      <a className={className} href={href} rel="noreferrer noopener" target="_blank">
        {children}
      </a>
    );
  }

  return (
    <Link className={className} to={href}>
      {children}
    </Link>
  );
}
