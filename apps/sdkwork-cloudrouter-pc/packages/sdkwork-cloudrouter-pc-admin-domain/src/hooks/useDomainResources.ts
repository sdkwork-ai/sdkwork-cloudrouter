/**
 * Shared read hooks for the Domain Center.
 *
 * Zones and DNS automation accounts are read by several sections (overview,
 * hostnames, DNS records, certificates). Loading them in one place keeps the
 * selectors consistent and lets each page stay a projection of the same lists.
 */

import { useCallback, useEffect, useState } from 'react';

import { domainCenterService } from '../domainService';
import type { DomainCloudAccount, DomainZone } from '../domainTypes';

export type DomainLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface DomainResource<T> {
  data: T;
  status: DomainLoadStatus;
  error: unknown;
  reload: () => void;
}

export interface DomainZoneResource extends DomainResource<DomainZone[]> {
  /** Convenience set used by the zone selectors. */
  zoneById: ReadonlyMap<string, DomainZone>;
}

export function useDomainZones(): DomainZoneResource {
  const [data, setData] = useState<DomainZone[]>([]);
  const [status, setStatus] = useState<DomainLoadStatus>('idle');
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError(null);
    domainCenterService
      .listAllZones()
      .then((zones) => {
        if (!active) {
          return;
        }
        setData(zones);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (!active) {
          return;
        }
        setError(cause);
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [reloadToken]);

  const zoneById = new Map(data.map((zone) => [zone.id, zone]));

  return { data, status, error, reload, zoneById };
}

export function useDomainCloudAccounts(): DomainResource<DomainCloudAccount[]> {
  const [data, setData] = useState<DomainCloudAccount[]>([]);
  const [status, setStatus] = useState<DomainLoadStatus>('idle');
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError(null);
    domainCenterService
      .listCloudAccounts()
      .then((page) => {
        if (!active) {
          return;
        }
        setData(page.items);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (!active) {
          return;
        }
        setError(cause);
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [reloadToken]);

  return { data, status, error, reload };
}

/** Accounts that can actually present a DNS-01 challenge today. */
export function usableDnsAccounts(accounts: readonly DomainCloudAccount[]): DomainCloudAccount[] {
  return accounts.filter(
    (account) => account.status === 'active' && account.credentialConfigured && Boolean(account.dnsProvider),
  );
}

/** `USER`-scope zones are the ones an operator defined; `PLATFORM` is provisioned. */
export function operatorZones(zones: readonly DomainZone[]): DomainZone[] {
  return zones.filter((zone) => zone.scope === 'USER');
}
