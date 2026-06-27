import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { AdminAnnouncementCreateRequest, AdminAnnouncementUpdateRequest, AnnouncementsCreateResult, AnnouncementsDeleteResult, AnnouncementsListResult, AnnouncementsUpdateResult } from '../types';


export class ContentAnnouncementsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List admin announcements */
  async list(): Promise<AnnouncementsListResult> {
    return this.client.get<AnnouncementsListResult>(backendApiPath(`/content/announcements`));
  }

/** Create admin announcement */
  async create(body: AdminAnnouncementCreateRequest): Promise<AnnouncementsCreateResult> {
    return this.client.post<AnnouncementsCreateResult>(backendApiPath(`/content/announcements`), body, undefined, undefined, 'application/json');
  }

/** Delete admin announcement */
  async delete(announcementId: string): Promise<AnnouncementsDeleteResult> {
    return this.client.delete<AnnouncementsDeleteResult>(backendApiPath(`/content/announcements/${serializePathParameter(announcementId, { name: 'announcementId', style: 'simple', explode: false })}`));
  }

/** Update admin announcement */
  async update(announcementId: string, body: AdminAnnouncementUpdateRequest): Promise<AnnouncementsUpdateResult> {
    return this.client.patch<AnnouncementsUpdateResult>(backendApiPath(`/content/announcements/${serializePathParameter(announcementId, { name: 'announcementId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export class ContentApi {
  private client: HttpClient;
  public readonly announcements: ContentAnnouncementsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.announcements = new ContentAnnouncementsApi(client);
  }

}

export function createContentApi(client: HttpClient): ContentApi {
  return new ContentApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}

interface PathParameterSpec {
  name: string;
  style: string;
  explode: boolean;
}

function serializePathParameter(value: unknown, spec: PathParameterSpec): string {
  if (value === undefined || value === null) {
    return '';
  }

  const style = spec.style || 'simple';
  if (Array.isArray(value)) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (typeof value === 'object') {
    return serializePathObject(spec.name, value as Record<string, unknown>, style, spec.explode);
  }
  return pathPrefix(spec.name, style, false) + encodePathValue(serializePathPrimitive(value));
}

function serializePathArray(name: string, values: unknown[], style: string, explode: boolean): string {
  const serialized = values
    .filter((item) => item !== undefined && item !== null)
    .map((item) => encodePathValue(serializePathPrimitive(item)));
  if (serialized.length === 0) {
    return pathPrefix(name, style, false);
  }
  if (style === 'matrix') {
    return explode
      ? serialized.map((item) => `;${name}=${item}`).join('')
      : `;${name}=${serialized.join(',')}`;
  }
  return pathPrefix(name, style, false) + serialized.join(explode ? '.' : ',');
}

function serializePathObject(name: string, value: Record<string, unknown>, style: string, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix(name, style, true);
  }
  if (style === 'matrix') {
    return explode
      ? entries.map(([key, entryValue]) => `;${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join('')
      : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',')}`;
  }
  const serialized = explode
    ? entries.map(([key, entryValue]) => `${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join(style === 'label' ? '.' : ',')
    : entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',');
  return pathPrefix(name, style, true) + serialized;
}

function pathPrefix(name: string, style: string, _objectValue: boolean): string {
  if (style === 'label') return '.';
  if (style === 'matrix') return `;${name}`;
  return '';
}

function encodePathValue(value: string): string {
  return encodeURIComponent(value);
}

function serializePathPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
