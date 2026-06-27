import { aiApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { OpenAiUpload, OpenAiUploadCompleteRequest, OpenAiUploadCreateRequest, OpenAiUploadPart, OpenAiUploadPartMultipartRequest } from '../types';


export class UploadsPartsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Add upload part */
  async create(uploadId: string, body: OpenAiUploadPartMultipartRequest): Promise<OpenAiUploadPart> {
    return this.client.post<OpenAiUploadPart>(aiApiPath(`/uploads/${serializePathParameter(uploadId, { name: 'upload_id', style: 'simple', explode: false })}/parts`), body, undefined, undefined, 'multipart/form-data');
  }
}

export class UploadsApi {
  private client: HttpClient;
  public readonly parts: UploadsPartsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.parts = new UploadsPartsApi(client);
  }


/** Create upload */
  async create(body: OpenAiUploadCreateRequest): Promise<OpenAiUpload> {
    return this.client.post<OpenAiUpload>(aiApiPath(`/uploads`), body, undefined, undefined, 'application/json');
  }

/** Cancel upload */
  async cancel(uploadId: string): Promise<OpenAiUpload> {
    return this.client.post<OpenAiUpload>(aiApiPath(`/uploads/${serializePathParameter(uploadId, { name: 'upload_id', style: 'simple', explode: false })}/cancel`));
  }

/** Complete upload */
  async complete(uploadId: string, body: OpenAiUploadCompleteRequest): Promise<OpenAiUpload> {
    return this.client.post<OpenAiUpload>(aiApiPath(`/uploads/${serializePathParameter(uploadId, { name: 'upload_id', style: 'simple', explode: false })}/complete`), body, undefined, undefined, 'application/json');
  }
}

export function createUploadsApi(client: HttpClient): UploadsApi {
  return new UploadsApi(client);
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
