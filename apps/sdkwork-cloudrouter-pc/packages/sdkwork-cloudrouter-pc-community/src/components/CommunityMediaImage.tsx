import { useEffect, useState } from 'react';

import { resolveCommunityResourceUrl } from '../runtime.ts';

/**
 * Image that resolves a stored `drive://` reference before rendering.
 *
 * Circle/group media stays a Drive reference on the backend; the browser needs
 * a short-lived download URL. Non-drive URLs render immediately.
 */
export function CommunityMediaImage({
  alt,
  className,
  uri,
}: {
  readonly alt: string;
  readonly className?: string;
  readonly uri?: string;
}) {
  const [src, setSrc] = useState<string | undefined>(
    uri && !uri.startsWith('drive://') ? uri : undefined,
  );

  useEffect(() => {
    if (!uri) {
      setSrc(undefined);
      return undefined;
    }
    if (!uri.startsWith('drive://')) {
      setSrc(uri);
      return undefined;
    }
    let cancelled = false;
    void resolveCommunityResourceUrl(uri).then((resolved) => {
      if (!cancelled) setSrc(resolved ?? undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (!src || !uri) {
    return <span className={`${className ?? ''} block animate-pulse bg-slate-100 dark:bg-slate-800`} aria-hidden="true" />;
  }
  return <img src={src} alt={alt} className={className} loading="lazy" />;
}
