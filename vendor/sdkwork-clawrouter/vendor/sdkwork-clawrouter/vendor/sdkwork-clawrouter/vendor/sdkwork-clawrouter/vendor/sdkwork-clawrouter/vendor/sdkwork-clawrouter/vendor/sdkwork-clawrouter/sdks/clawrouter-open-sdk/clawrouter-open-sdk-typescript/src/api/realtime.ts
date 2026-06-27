import { aiApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { OpenAiRealtimeCall, OpenAiRealtimeCallActionRequest, OpenAiRealtimeCallCreateRequest, OpenAiRealtimeCallReferRequest, OpenAiRealtimeClientSecret, OpenAiRealtimeClientSecretCreateRequest, OpenAiRealtimeSession, OpenAiRealtimeSessionCreateRequest, OpenAiRealtimeTranscriptionSession, OpenAiRealtimeTranscriptionSessionCreateRequest, OpenAiRealtimeTranslationSession, OpenAiRealtimeTranslationSessionCreateRequest, SdpResponse } from '../types';


export class RealtimeTranslationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create realtime translation session */
  async create(body: OpenAiRealtimeTranslationSessionCreateRequest): Promise<OpenAiRealtimeTranslationSession> {
    return this.client.post<OpenAiRealtimeTranslationSession>(aiApiPath(`/realtime/translations`), body, undefined, undefined, 'application/json');
  }
}

export class RealtimeTranscriptionSessionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create realtime transcription session */
  async create(body: OpenAiRealtimeTranscriptionSessionCreateRequest): Promise<OpenAiRealtimeTranscriptionSession> {
    return this.client.post<OpenAiRealtimeTranscriptionSession>(aiApiPath(`/realtime/transcription_sessions`), body, undefined, undefined, 'application/json');
  }
}

export class RealtimeSessionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create realtime session */
  async create(body: OpenAiRealtimeSessionCreateRequest): Promise<OpenAiRealtimeSession> {
    return this.client.post<OpenAiRealtimeSession>(aiApiPath(`/realtime/sessions`), body, undefined, undefined, 'application/json');
  }
}

export class RealtimeClientSecretsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create realtime client secret */
  async create(body: OpenAiRealtimeClientSecretCreateRequest): Promise<OpenAiRealtimeClientSecret> {
    return this.client.post<OpenAiRealtimeClientSecret>(aiApiPath(`/realtime/client_secrets`), body, undefined, undefined, 'application/json');
  }
}

export class RealtimeCallsRejectApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Reject realtime call */
  async create(callId: string, body: OpenAiRealtimeCallActionRequest): Promise<OpenAiRealtimeCall> {
    return this.client.post<OpenAiRealtimeCall>(aiApiPath(`/realtime/calls/${serializePathParameter(callId, { name: 'call_id', style: 'simple', explode: false })}/reject`), body, undefined, undefined, 'application/json');
  }
}

export class RealtimeCallsReferApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Refer realtime call */
  async create(callId: string, body: OpenAiRealtimeCallReferRequest): Promise<OpenAiRealtimeCall> {
    return this.client.post<OpenAiRealtimeCall>(aiApiPath(`/realtime/calls/${serializePathParameter(callId, { name: 'call_id', style: 'simple', explode: false })}/refer`), body, undefined, undefined, 'application/json');
  }
}

export class RealtimeCallsHangupApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Hang up realtime call */
  async create(callId: string, body: OpenAiRealtimeCallActionRequest): Promise<OpenAiRealtimeCall> {
    return this.client.post<OpenAiRealtimeCall>(aiApiPath(`/realtime/calls/${serializePathParameter(callId, { name: 'call_id', style: 'simple', explode: false })}/hangup`), body, undefined, undefined, 'application/json');
  }
}

export class RealtimeCallsAcceptApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Accept realtime call */
  async create(callId: string, body: OpenAiRealtimeCallActionRequest): Promise<OpenAiRealtimeCall> {
    return this.client.post<OpenAiRealtimeCall>(aiApiPath(`/realtime/calls/${serializePathParameter(callId, { name: 'call_id', style: 'simple', explode: false })}/accept`), body, undefined, undefined, 'application/json');
  }
}

export class RealtimeCallsApi {
  private client: HttpClient;
  public readonly accept: RealtimeCallsAcceptApi;
  public readonly hangup: RealtimeCallsHangupApi;
  public readonly refer: RealtimeCallsReferApi;
  public readonly reject: RealtimeCallsRejectApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.accept = new RealtimeCallsAcceptApi(client);
    this.hangup = new RealtimeCallsHangupApi(client);
    this.refer = new RealtimeCallsReferApi(client);
    this.reject = new RealtimeCallsRejectApi(client);
  }


/** Create realtime call */
  async create(body: OpenAiRealtimeCallCreateRequest): Promise<SdpResponse> {
    return this.client.post<SdpResponse>(aiApiPath(`/realtime/calls`), body, undefined, undefined, 'application/json');
  }
}

export class RealtimeApi {
  private client: HttpClient;
  public readonly calls: RealtimeCallsApi;
  public readonly clientSecrets: RealtimeClientSecretsApi;
  public readonly sessions: RealtimeSessionsApi;
  public readonly transcriptionSessions: RealtimeTranscriptionSessionsApi;
  public readonly translations: RealtimeTranslationsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.calls = new RealtimeCallsApi(client);
    this.clientSecrets = new RealtimeClientSecretsApi(client);
    this.sessions = new RealtimeSessionsApi(client);
    this.transcriptionSessions = new RealtimeTranscriptionSessionsApi(client);
    this.translations = new RealtimeTranslationsApi(client);
  }

}

export function createRealtimeApi(client: HttpClient): RealtimeApi {
  return new RealtimeApi(client);
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
