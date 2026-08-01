import type { MediaResource } from '@sdkwork/assets-core';

import { normalizeOptionalJsonObject, type JsonObject } from './json-value.ts';
import { isBlank, trim } from './sdkwork-utils.ts';

export type ClawRouterMediaResource = MediaResource;
export type ClawRouterMediaKind = ClawRouterMediaResource['kind'];
type ClawRouterMediaChecksumAlgorithm = 'etag' | 'md5' | 'sha256';

export interface ClawRouterSdkMediaResource {
  access?: ClawRouterMediaResource['access'];
  ai?: ClawRouterMediaResource['ai'];
  altText?: string;
  checksum?: {
    algorithm: ClawRouterMediaChecksumAlgorithm;
    value: string;
  };
  durationSeconds?: number;
  fileName?: string;
  height?: number;
  id?: string;
  kind: ClawRouterMediaResource['kind'];
  metadata?: JsonObject;
  mimeType?: string;
  objectBlobId?: string;
  poster?: ClawRouterSdkMediaResource;
  publicUrl?: string;
  sizeBytes?: string;
  source: ClawRouterMediaResource['source'];
  thumbnails?: ClawRouterSdkMediaResource[];
  title?: string;
  uri?: string;
  url?: string;
  variants?: ClawRouterSdkMediaResource[];
  width?: number;
}

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

export function toSdkMediaResource(
  value: ClawRouterMediaResource | undefined,
  fieldName = 'media',
): ClawRouterSdkMediaResource | undefined {
  if (!value) {
    return undefined;
  }
  const checksum = value.checksum
    ? {
        algorithm: normalizeMediaChecksumAlgorithm(value.checksum.algorithm, `${fieldName}.checksum.algorithm`),
        value: normalizeRequiredMediaText(value.checksum.value, `${fieldName}.checksum.value`),
      }
    : undefined;
  return {
    access: value.access,
    ai: value.ai,
    altText: value.altText,
    checksum,
    durationSeconds: value.durationSeconds,
    fileName: value.fileName,
    height: value.height,
    id: value.id,
    kind: value.kind,
    metadata: normalizeOptionalJsonObject(value.metadata, `${fieldName}.metadata`),
    mimeType: value.mimeType,
    objectBlobId: value.objectBlobId,
    poster: toSdkMediaResource(value.poster, `${fieldName}.poster`),
    publicUrl: value.publicUrl,
    sizeBytes: value.sizeBytes,
    source: value.source,
    thumbnails: value.thumbnails?.map((item, index) =>
      toRequiredSdkMediaResource(item, `${fieldName}.thumbnails[${index}]`)),
    title: value.title,
    uri: value.uri,
    url: value.url,
    variants: value.variants?.map((item, index) =>
      toRequiredSdkMediaResource(item, `${fieldName}.variants[${index}]`)),
    width: value.width,
  };
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

function toRequiredSdkMediaResource(
  value: ClawRouterMediaResource,
  fieldName: string,
): ClawRouterSdkMediaResource {
  const resource = toSdkMediaResource(value, fieldName);
  if (!resource) {
    throw new Error(`${fieldName} is required`);
  }
  return resource;
}

function normalizeMediaChecksumAlgorithm(
  value: string,
  fieldName: string,
): ClawRouterMediaChecksumAlgorithm {
  const normalized = trim(value).toLowerCase().replace(/-/g, '');
  if (normalized === 'sha256' || normalized === 'md5' || normalized === 'etag') {
    return normalized;
  }
  throw new Error(`${fieldName} must be sha256, md5, or etag`);
}

function normalizeRequiredMediaText(value: string, fieldName: string): string {
  const normalized = trim(value);
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}
