import type { MediaResource } from '@sdkwork/clawrouter-app-sdk';

import { isBlank, trim } from './sdkwork-utils.ts';

export type ClawRouterMediaResource = MediaResource;
export type ClawRouterMediaKind = ClawRouterMediaResource['kind'];

export function toExternalUrlMediaResource(
  value: string | null | undefined,
  kind: ClawRouterMediaKind = 'image',
): ClawRouterMediaResource | undefined {
  const url = normalizeMediaUrl(value);
  if (!url) {
    return undefined;
  }
  return {
    kind,
    source: url.startsWith('data:') ? 'data_url' : 'external_url',
    url,
    publicUrl: url,
  };
}

export function toNullableExternalUrlMediaResource(
  value: string | null | undefined,
  kind: ClawRouterMediaKind = 'image',
): ClawRouterMediaResource | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  const media = toExternalUrlMediaResource(value, kind);
  return media ?? null;
}

export function readMediaResourceUrl(value: unknown): string {
  const resource = readMediaResource(value);
  if (!resource || typeof resource !== 'object' || Array.isArray(resource)) {
    return '';
  }
  const record = resource as unknown as Record<string, unknown>;
  for (const key of ['publicUrl', 'url', 'uri', 'objectKey', 'objectBlobId', 'id']) {
    const raw = record[key];
    if (typeof raw === 'string') {
      const normalized = trim(raw);
      if (!isBlank(normalized)) {
        return normalized;
      }
    }
  }
  return '';
}

export function readMediaResource(value: unknown): ClawRouterMediaResource | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.kind !== 'string' || typeof record.source !== 'string') {
    return undefined;
  }
  return value as ClawRouterMediaResource;
}

export function readRequiredMediaResource(value: unknown, message: string): ClawRouterMediaResource {
  const resource = readMediaResource(value);
  if (!resource) {
    throw new Error(message);
  }
  return resource;
}

export function readNullableMediaResourceUrl(value: unknown): string | null {
  const url = readMediaResourceUrl(value);
  return url || null;
}

export function toExternalUrlMediaResources(
  values: readonly string[] | null | undefined,
  kind: ClawRouterMediaKind = 'image',
): ClawRouterMediaResource[] | undefined {
  if (values === undefined || values === null) {
    return undefined;
  }
  const resources = values
    .map((value) => toExternalUrlMediaResource(value, kind))
    .filter((value): value is ClawRouterMediaResource => value !== undefined);
  return resources;
}

function normalizeMediaUrl(value: string | null | undefined): string {
  return typeof value === 'string' ? trim(value) : '';
}
