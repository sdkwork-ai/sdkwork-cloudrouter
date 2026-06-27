export type CommerceProductAdminMediaKind =
  | "archive"
  | "audio"
  | "document"
  | "image"
  | "model"
  | "other"
  | "video";

export type CommerceProductAdminMediaSource =
  | "data_url"
  | "external_url"
  | "generated"
  | "object_storage"
  | "provider_asset";

export interface CommerceProductAdminMediaResource {
  kind: CommerceProductAdminMediaKind;
  source: CommerceProductAdminMediaSource;
  altText?: string;
  id?: string;
  objectBlobId?: string;
  objectKey?: string;
  publicUrl?: string;
  uri?: string;
  url?: string;
  [key: string]: unknown;
}

export type ClawRouterMediaResource = CommerceProductAdminMediaResource;
export type ClawRouterMediaKind = CommerceProductAdminMediaKind;

export function toExternalUrlMediaResource(
  value: string | null | undefined,
  kind: ClawRouterMediaKind = "image",
): ClawRouterMediaResource | undefined {
  const url = normalizeMediaUrl(value);
  if (!url) {
    return undefined;
  }
  return {
    kind,
    publicUrl: url,
    source: url.startsWith("data:") ? "data_url" : "external_url",
    url,
  };
}

export function readMediaResourceUrl(value: unknown): string {
  const resource = readMediaResource(value);
  if (!resource) {
    return "";
  }
  for (const key of ["publicUrl", "url", "uri", "objectKey", "objectBlobId", "id"]) {
    const raw = resource[key];
    if (typeof raw === "string") {
      const normalized = raw.trim();
      if (normalized) {
        return normalized;
      }
    }
  }
  return "";
}

export function readMediaResource(value: unknown): ClawRouterMediaResource | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.kind !== "string" || typeof record.source !== "string") {
    return undefined;
  }
  return value as ClawRouterMediaResource;
}

function normalizeMediaUrl(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}
