import type { RuntimeEventItem } from '@sdkwork/clawrouter-app-sdk';
import { truncate } from '@sdkwork/utils/string';

export type RuntimeStreamEvent = RuntimeEventItem;

const MAX_RUNTIME_EVENT_TYPE_CHARACTERS = 256;
const MAX_RUNTIME_PAYLOAD_DEPTH = 8;
const MAX_RUNTIME_PAYLOAD_ARRAY_ITEMS = 128;
const MAX_RUNTIME_TEXT_DELTA_CHARACTERS = 64 * 1024;

export function readRuntimeTextDelta(event: RuntimeStreamEvent): string {
  if (!isRuntimeTextDeltaEvent(event)) {
    return '';
  }
  if (typeof event.textDelta === 'string' && event.textDelta.length > 0) {
    return truncateRuntimeTextDelta(event.textDelta);
  }
  return readRuntimePayloadTextDelta(event.payloadJson);
}

function isRuntimeTextDeltaEvent(event: RuntimeStreamEvent): boolean {
  if (typeof event.eventType !== 'string') {
    return false;
  }
  const eventType = truncate(event.eventType, MAX_RUNTIME_EVENT_TYPE_CHARACTERS, '').trim().toLowerCase();
  return eventType === 'message.delta'
    || eventType === 'response.delta'
    || eventType === 'runtime.delta'
    || eventType.endsWith('.delta');
}

function readRuntimePayloadTextDelta(payload: unknown): string {
  return readRuntimePayloadTextDeltaFromUnknown(payload, 0);
}

function readRuntimePayloadTextDeltaFromUnknown(value: unknown, depth: number): string {
  if (depth > MAX_RUNTIME_PAYLOAD_DEPTH || value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return truncateRuntimeTextDelta(value);
  }

  if (typeof value !== 'object') {
    return '';
  }

  if (Array.isArray(value)) {
    let text = '';
    const itemCount = Math.min(value.length, MAX_RUNTIME_PAYLOAD_ARRAY_ITEMS);
    for (let index = 0; index < itemCount && text.length < MAX_RUNTIME_TEXT_DELTA_CHARACTERS; index += 1) {
      const part = readRuntimePayloadTextDeltaFromUnknown(value[index], depth + 1);
      if (part) {
        text = appendRuntimeTextPart(text, part);
      }
    }
    return text;
  }

  const record = value as Record<string, unknown>;

  for (const key of ['textDelta', 'text_delta', 'outputText', 'output_text', 'delta', 'content', 'text']) {
    const item = record[key];
    if (typeof item === 'string' && item.length > 0) {
      return truncateRuntimeTextDelta(item);
    }
  }

  for (const key of [
    'delta',
    'content',
    'parts',
    'output',
    'choices',
    'candidates',
    'message',
    'response',
    'data',
    'result',
    'payload',
    'payloadJson',
    'gatewayEvent',
    'providerEvent',
    'gatewayResponse',
    'providerResponse',
  ]) {
    const text = readRuntimePayloadTextDeltaFromUnknown(record[key], depth + 1);
    if (text) {
      return text;
    }
  }

  return '';
}

function appendRuntimeTextPart(current: string, part: string): string {
  if (!current) {
    return truncateRuntimeTextDelta(part);
  }

  const remainingCharacters = MAX_RUNTIME_TEXT_DELTA_CHARACTERS - current.length;
  if (remainingCharacters <= 0) {
    return current;
  }

  if (!shouldInsertRuntimeTextPartBoundary(current, part)) {
    return `${current}${truncate(part, remainingCharacters, '')}`;
  }
  if (remainingCharacters === 1) {
    return `${current}\n`;
  }
  return `${current}\n${truncate(part, remainingCharacters - 1, '')}`;
}

function truncateRuntimeTextDelta(value: string): string {
  return truncate(value, MAX_RUNTIME_TEXT_DELTA_CHARACTERS, '');
}

function shouldInsertRuntimeTextPartBoundary(left: string, right: string): boolean {
  if (!left || !right) {
    return false;
  }
  if (/[\s]$/.test(left) || /^[\s]/.test(right)) {
    return false;
  }
  return true;
}
