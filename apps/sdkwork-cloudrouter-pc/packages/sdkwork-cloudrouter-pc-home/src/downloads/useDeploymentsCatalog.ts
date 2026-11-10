import { useEffect, useState } from 'react';
import {
  deploymentsBaseUrl,
  fetchDeploymentsCatalog,
  readDownloadsPointer,
} from './deploymentsCatalog.ts';

/** A catalog tagged with the pointer key it was fetched for. */
interface LoadedCatalog {
  readonly key: string;
  readonly catalog: unknown;
}

/**
 * Resolves the Deployments catalog a pointer site settings document refers to.
 *
 * The fetched catalog is tagged with its pointer key so a key change never
 * renders the previous catalog while the new request is in flight.
 *
 * @param value - Stored `downloads` document (a pointer after the migration).
 * @returns The fetched catalog, or `undefined` while absent/loading/failed.
 */
export function useDeploymentsCatalog(value: unknown): unknown | undefined {
  const catalogKey = readDownloadsPointer(value);
  const [loaded, setLoaded] = useState<LoadedCatalog | undefined>(undefined);

  useEffect(() => {
    if (catalogKey === undefined) return;
    let live = true;
    void fetchDeploymentsCatalog(deploymentsBaseUrl(), catalogKey).then((catalog) => {
      if (live && catalog !== undefined) setLoaded({ key: catalogKey, catalog });
    });
    return () => {
      live = false;
    };
  }, [catalogKey]);

  return catalogKey !== undefined && loaded?.key === catalogKey ? loaded.catalog : undefined;
}
