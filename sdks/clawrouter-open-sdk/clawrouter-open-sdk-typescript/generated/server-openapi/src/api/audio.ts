import { aiApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { DeleteResult, OpenAiAudioTranscription, OpenAiAudioTranscriptionRequest, OpenAiAudioTranslation, OpenAiAudioTranslationRequest, OpenAiSpeechCreateRequest, OpenAiVoice, OpenAiVoiceConsent, OpenAiVoiceConsentCreateRequest, OpenAiVoiceConsentList, OpenAiVoiceConsentUpdateRequest, OpenAiVoiceCreateRequest, OpenAiVoiceList } from '../types';


export interface AudioVoicesListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class AudioVoicesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List voices */
  async list(params?: AudioVoicesListParams): Promise<OpenAiVoiceList> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiVoiceList>(appendQueryString(aiApiPath(`/audio/voices`), query));
  }

/** Create voice */
  async create(body: OpenAiVoiceCreateRequest): Promise<OpenAiVoice> {
    return this.client.post<OpenAiVoice>(aiApiPath(`/audio/voices`), body, undefined, undefined, 'application/json');
  }

/** Retrieve voice */
  async retrieve(voiceId: string): Promise<OpenAiVoice> {
    return this.client.get<OpenAiVoice>(aiApiPath(`/audio/voices/${serializePathParameter(voiceId, { name: 'voice_id', style: 'simple', explode: false })}`));
  }
}

export interface AudioVoiceConsentsListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class AudioVoiceConsentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List voice consents */
  async list(params?: AudioVoiceConsentsListParams): Promise<OpenAiVoiceConsentList> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiVoiceConsentList>(appendQueryString(aiApiPath(`/audio/voice_consents`), query));
  }

/** Create voice consent */
  async create(body: OpenAiVoiceConsentCreateRequest): Promise<OpenAiVoiceConsent> {
    return this.client.post<OpenAiVoiceConsent>(aiApiPath(`/audio/voice_consents`), body, undefined, undefined, 'application/json');
  }

/** Delete voice consent */
  async delete(consentId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/audio/voice_consents/${serializePathParameter(consentId, { name: 'consent_id', style: 'simple', explode: false })}`));
  }

/** Retrieve voice consent */
  async retrieve(consentId: string): Promise<OpenAiVoiceConsent> {
    return this.client.get<OpenAiVoiceConsent>(aiApiPath(`/audio/voice_consents/${serializePathParameter(consentId, { name: 'consent_id', style: 'simple', explode: false })}`));
  }

/** Update voice consent */
  async update(consentId: string, body: OpenAiVoiceConsentUpdateRequest): Promise<OpenAiVoiceConsent> {
    return this.client.post<OpenAiVoiceConsent>(aiApiPath(`/audio/voice_consents/${serializePathParameter(consentId, { name: 'consent_id', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export class AudioTranslationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create translation */
  async create(body: OpenAiAudioTranslationRequest): Promise<OpenAiAudioTranslation> {
    return this.client.post<OpenAiAudioTranslation>(aiApiPath(`/audio/translations`), body, undefined, undefined, 'application/json');
  }
}

export class AudioTranscriptionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create transcription */
  async create(body: OpenAiAudioTranscriptionRequest): Promise<OpenAiAudioTranscription> {
    return this.client.post<OpenAiAudioTranscription>(aiApiPath(`/audio/transcriptions`), body, undefined, undefined, 'application/json');
  }
}

export class AudioSpeechApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create speech */
  async create(body: OpenAiSpeechCreateRequest): Promise<Blob> {
    return this.client.post<Blob>(aiApiPath(`/audio/speech`), body, undefined, undefined, 'application/json');
  }
}

export class AudioApi {
  private client: HttpClient;
  public readonly speech: AudioSpeechApi;
  public readonly transcriptions: AudioTranscriptionsApi;
  public readonly translations: AudioTranslationsApi;
  public readonly voiceConsents: AudioVoiceConsentsApi;
  public readonly voices: AudioVoicesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.speech = new AudioSpeechApi(client);
    this.transcriptions = new AudioTranscriptionsApi(client);
    this.translations = new AudioTranslationsApi(client);
    this.voiceConsents = new AudioVoiceConsentsApi(client);
    this.voices = new AudioVoicesApi(client);
  }

}

export function createAudioApi(client: HttpClient): AudioApi {
  return new AudioApi(client);
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
