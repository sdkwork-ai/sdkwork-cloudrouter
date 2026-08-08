import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveProblemMessage,
  type ProblemMessageTranslate,
} from './problem-message.ts';

/** Catalog stub mirroring i18next: known keys resolve, unknown keys return defaultValue. */
function createTranslate(catalog: Record<string, string>): ProblemMessageTranslate {
  return (key, options = {}) => {
    const template = catalog[key];
    if (template === undefined) {
      return options.defaultValue ?? key;
    }
    return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, name) => {
      const value = options[name];
      return value === undefined || value === null ? '' : String(value);
    });
  };
}

function problemError(problem: unknown): Error {
  return Object.assign(new Error('fallback raw message'), { problem });
}

test('translates by specific i18nKey with params', () => {
  const t = createTranslate({
    'validation.common.field.required': '{{field}} 为必填项',
  });
  const error = problemError({
    code: 40001,
    i18nKey: 'validation.common.field.required',
    params: { field: 'supplierName' },
    detail: 'supplierName is required',
  });
  assert.equal(resolveProblemMessage(error, t, 'fallback'), 'supplierName 为必填项');
});

test('falls back to errors.result.<code> when no specific key', () => {
  const t = createTranslate({
    'errors.result.40401': '请求的资源不存在',
  });
  const error = problemError({
    code: 40401,
    detail: 'The requested resource was not found',
  });
  assert.equal(resolveProblemMessage(error, t, 'fallback'), '请求的资源不存在');
});

test('falls back to raw backend detail when key unknown', () => {
  const t = createTranslate({});
  const error = problemError({
    code: 40003,
    i18nKey: 'validation.unknown.key',
    detail: 'page must be greater than or equal to 1',
  });
  assert.equal(resolveProblemMessage(error, t, 'fallback'), 'page must be greater than or equal to 1');
});

test('falls back to caller fallback when error has no message', () => {
  const t = createTranslate({});
  assert.equal(resolveProblemMessage(new Error(''), t, '本地回退'), '本地回退');
  assert.equal(resolveProblemMessage(undefined, t, '本地回退'), '本地回退');
});

test('translates legacy dotted message keys from the catalog', () => {
  const t = createTranslate({
    'console.gateway.states.loadErrorFallback': '网关追踪加载失败',
  });
  const error = new Error('console.gateway.states.loadErrorFallback');
  assert.equal(resolveProblemMessage(error, t, 'fallback'), '网关追踪加载失败');
});

test('keeps non-catalog dotted messages as-is', () => {
  const t = createTranslate({});
  const error = new Error('console.gateway.unknownKey');
  assert.equal(resolveProblemMessage(error, t, 'fallback'), 'console.gateway.unknownKey');
});

test('handles string codes', () => {
  const t = createTranslate({
    'errors.result.40001': '请求参数校验失败',
  });
  const error = problemError({ code: '40001', detail: 'invalid' });
  assert.equal(resolveProblemMessage(error, t, 'fallback'), '请求参数校验失败');
});
