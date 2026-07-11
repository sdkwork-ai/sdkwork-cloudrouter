import { aiApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { DeleteResult, OpenAiVideo, OpenAiVideoCharacter, OpenAiVideoCharacterCreateRequest, OpenAiVideoCreateRequest, OpenAiVideoEditRequest, OpenAiVideoExtendRequest, OpenAiVideoList, OpenAiVideoRemixRequest } from '../types';


export class VideoRemixApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Remix video */
  async create(videoId: string, body: OpenAiVideoRemixRequest): Promise<OpenAiVideo> {
    return this.client.post<OpenAiVideo>(aiApiPath(`/videos/${serializePathParameter(videoId, { name: 'video_id', style: 'simple', explode: false })}/remix`), body, undefined, undefined, 'application/json');
  }
}

export class VideoExtensionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Extend video */
  async create(body: OpenAiVideoExtendRequest): Promise<OpenAiVideo> {
    return this.client.post<OpenAiVideo>(aiApiPath(`/videos/extensions`), body, undefined, undefined, 'application/json');
  }
}

export class VideoEditsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Edit video */
  async create(body: OpenAiVideoEditRequest): Promise<OpenAiVideo> {
    return this.client.post<OpenAiVideo>(aiApiPath(`/videos/edits`), body, undefined, undefined, 'application/json');
  }
}

export class VideoCharactersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create video character */
  async create(body: OpenAiVideoCharacterCreateRequest): Promise<OpenAiVideoCharacter> {
    return this.client.post<OpenAiVideoCharacter>(aiApiPath(`/videos/characters`), body, undefined, undefined, 'application/json');
  }

/** Retrieve video character */
  async retrieve(characterId: string): Promise<OpenAiVideoCharacter> {
    return this.client.get<OpenAiVideoCharacter>(aiApiPath(`/videos/characters/${serializePathParameter(characterId, { name: 'character_id', style: 'simple', explode: false })}`));
  }
}

export interface VideoListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class VideoApi {
  private client: HttpClient;
  public readonly characters: VideoCharactersApi;
  public readonly edits: VideoEditsApi;
  public readonly extensions: VideoExtensionsApi;
  public readonly remix: VideoRemixApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.characters = new VideoCharactersApi(client);
    this.edits = new VideoEditsApi(client);
    this.extensions = new VideoExtensionsApi(client);
    this.remix = new VideoRemixApi(client);
  }


/** List videos */
  async list(params?: VideoListParams): Promise<OpenAiVideoList> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiVideoList>(appendQueryString(aiApiPath(`/videos`), query));
  }

/** Create video */
  async create(body: OpenAiVideoCreateRequest): Promise<OpenAiVideo> {
    return this.client.post<OpenAiVideo>(aiApiPath(`/videos`), body, undefined, undefined, 'application/json');
  }

/** Delete video */
  async delete(videoId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/videos/${serializePathParameter(videoId, { name: 'video_id', style: 'simple', explode: false })}`));
  }

/** Retrieve video */
  async retrieve(videoId: string): Promise<OpenAiVideo> {
    return this.client.get<OpenAiVideo>(aiApiPath(`/videos/${serializePathParameter(videoId, { name: 'video_id', style: 'simple', explode: false })}`));
  }

/** Retrieve video content */
  async content(videoId: string): Promise<Blob> {
    return this.client.get<Blob>(aiApiPath(`/videos/${serializePathParameter(videoId, { name: 'video_id', style: 'simple', explode: false })}/content`));
  }
}

export function createVideoApi(client: HttpClient): VideoApi {
  return new VideoApi(client);
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
interface QueryParameterSpec {
  name: string;
  value: unknown;
  style: string;
  explode: boolean;
  allowReserved: boolean;
  contentType?: string;
}

function buildQueryString(parameters: QueryParameterSpec[]): string {
  const pairs: string[] = [];
  for (const parameter of parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

function appendSerializedParameter(pairs: string[], parameter: QueryParameterSpec): void {
  if (parameter.value === undefined || parameter.value === null) {
    return;
  }

  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }

  const style = parameter.style || 'form';
  if (style === 'deepObject') {
    appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }

  if (Array.isArray(parameter.value)) {
    appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }

  if (typeof parameter.value === 'object') {
    appendObjectParameter(pairs, parameter.name, parameter.value as Record<string, unknown>, style, parameter.explode, parameter.allowReserved);
    return;
  }

  pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}

function appendArrayParameter(
  pairs: string[],
  name: string,
  value: unknown[],
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const values = value
    .filter((item) => item !== undefined && item !== null)
    .map((item) => serializePrimitive(item));
  if (values.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
    }
    return;
  }

  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(','), allowReserved)}`);
}

function appendObjectParameter(
  pairs: string[],
  name: string,
  value: Record<string, unknown>,
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
    return;
  }

  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(',');
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}

function appendDeepObjectParameter(
  pairs: string[],
  name: string,
  value: unknown,
  allowReserved: boolean,
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
    return;
  }

  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (entryValue === undefined || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
  }
}

function serializePrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value);
}

function encodeQueryValue(value: string, allowReserved: boolean): string {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%23/gi, '#')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
    .replace(/%40/gi, '@')
    .replace(/%21/gi, '!')
    .replace(/%24/gi, '$')
    .replace(/%26/gi, '&')
    .replace(/%27/gi, "'")
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%2A/gi, '*')
    .replace(/%2B/gi, '+')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%3D/gi, '=');
}
