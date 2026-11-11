import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { KlingAudioTask, KlingSoundGenerationRequest, KlingVideoToAudioRequest } from '../types';


export class AudioKlingV1AudioVideoToAudioApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Kling video to audio */
  async create(body: KlingVideoToAudioRequest, requestOptions?: ApiRequestOptions): Promise<KlingAudioTask> {
    return this.client.request<KlingAudioTask>(`/kling/v1/audio/video-to-audio`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class AudioKlingV1AudioTextToAudioApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Kling text to audio */
  async create(body: KlingSoundGenerationRequest, requestOptions?: ApiRequestOptions): Promise<KlingAudioTask> {
    return this.client.request<KlingAudioTask>(`/kling/v1/audio/text-to-audio`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Kling retrieve text to audio task */
  async retrieve(taskId: string, requestOptions?: ApiRequestOptions): Promise<KlingAudioTask> {
    return this.client.request<KlingAudioTask>(`/kling/v1/audio/text-to-audio/${serializePathParameter(taskId, { name: 'task_id', style: 'simple', explode: false })}`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any });
  }
}

export class AudioKlingV1AudioApi {
  public readonly textToAudio: AudioKlingV1AudioTextToAudioApi;
  public readonly videoToAudio: AudioKlingV1AudioVideoToAudioApi;

  constructor(client: HttpClient) {
    this.textToAudio = new AudioKlingV1AudioTextToAudioApi(client);
    this.videoToAudio = new AudioKlingV1AudioVideoToAudioApi(client);
  }

}

export class AudioKlingV1Api {
  public readonly audio: AudioKlingV1AudioApi;

  constructor(client: HttpClient) {
    this.audio = new AudioKlingV1AudioApi(client);
  }

}

export class AudioKlingApi {
  public readonly v1: AudioKlingV1Api;

  constructor(client: HttpClient) {
    this.v1 = new AudioKlingV1Api(client);
  }

}

export function createAudioKlingApi(client: HttpClient): AudioKlingApi {
  return new AudioKlingApi(client);
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
