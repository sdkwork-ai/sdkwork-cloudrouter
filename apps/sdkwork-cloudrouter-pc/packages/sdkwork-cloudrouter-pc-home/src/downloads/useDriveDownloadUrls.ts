import { useEffect, useState } from 'react';
import { resolveDriveMediaUrl } from '@sdkwork/cloudroutes-pc-commons/runtime';
import type { SdkworkDownloadDriveRef } from './cloudRouterDownloads';

/**
 * How often resolved download URLs are re-exchanged.
 *
 * Drive presigns live at most one hour, so a visitor who keeps the page open past that point
 * would otherwise click through to an expired URL. Re-resolving on this cadence mirrors the
 * public footer's media refresh; `resolveDriveMediaUrl` serves its own cached URL while it is
 * still fresh and only re-exchanges when it is not, so the interval costs nothing while every
 * URL is young.
 */
const DRIVE_DOWNLOAD_URL_REFRESH_MS = 25 * 60 * 1000;

/**
 * Resolves Drive installer references to downloadable URLs.
 *
 * The console uploads an installer to Drive and publishes the node reference plus its read-only
 * share token; a visitor's browser exchanges that token for a short-lived presigned URL through
 * the open Drive surface — the same chain the public footer's QR artwork uses. Resolutions run
 * independently, so one slow or failing reference cannot stall the others; a failure leaves the
 * action disabled (the catalog never renders a link that cannot be followed), and the refresh
 * interval retries failed keys on its next pass. `resolveDriveMediaUrl` caches tokens and signed
 * URLs internally, so re-renders and refresh passes do not re-exchange fresh URLs.
 */
export function useDriveDownloadUrls(
  refs: ReadonlyMap<string, SdkworkDownloadDriveRef>,
): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    let active = true;

    const resolveAll = () => {
      if (refs.size === 0) {
        setUrls((current) => (current.size === 0 ? current : new Map()));
        return;
      }
      for (const [key, ref] of refs) {
        const resource = {
          kind: 'document' as const,
          source: 'drive' as const,
          uri: ref.spaceId
            ? `drive://spaces/${ref.spaceId}/nodes/${ref.nodeId}`
            : `drive://spaces/unknown/nodes/${ref.nodeId}`,
          metadata: {
            drive: {
              nodeId: ref.nodeId,
              ...(ref.shareToken ? { shareToken: ref.shareToken } : {}),
              ...(ref.spaceId ? { spaceId: ref.spaceId } : {}),
            },
          },
        };
        resolveDriveMediaUrl(resource)
          .then((url) => {
            if (!active) {
              return;
            }
            setUrls((current) => {
              if (url) {
                if (current.get(key) === url) {
                  return current;
                }
                const next = new Map(current);
                next.set(key, url);
                return next;
              }
              return current.has(key)
                ? new Map([...current].filter(([staleKey]) => staleKey !== key))
                : current;
            });
          })
          .catch(() => {
            if (active) {
              setUrls((current) => {
                if (!current.has(key)) {
                  return current;
                }
                const next = new Map(current);
                next.delete(key);
                return next;
              });
            }
          });
      }
    };

    resolveAll();
    const timer = window.setInterval(resolveAll, DRIVE_DOWNLOAD_URL_REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refs]);

  return urls;
}
