import { describe, expect, it } from 'vitest';
import {
  dataNameLocale,
  humanizeCode,
  regionDisplayName,
  vendorDisplayName,
} from './dataNames';

describe('pricing data name localization', () => {
  it('resolves known vendors to localized display names', () => {
    expect(vendorDisplayName('openai', 'en-US')).toBe('OpenAI');
    expect(vendorDisplayName('openai', 'zh-CN')).toBe('OpenAI');
    expect(vendorDisplayName('google', 'zh-CN')).toBe('谷歌');
    expect(vendorDisplayName('alibaba', 'zh-CN')).toBe('阿里云');
    expect(vendorDisplayName('volcengine', 'zh-CN')).toBe('火山引擎');
    expect(vendorDisplayName('deepseek', 'ja-JP')).toBe('DeepSeek');
  });

  it('resolves known regions to localized display names', () => {
    expect(regionDisplayName('global', 'en-US')).toBe('Global');
    expect(regionDisplayName('cn', 'zh-CN')).toBe('中国大陆');
    expect(regionDisplayName('us', 'en-US')).toBe('United States');
    expect(regionDisplayName('us_east_1', 'zh-CN')).toBe('美国东部（弗吉尼亚北部）');
  });

  it('falls back to humanized codes for unknown catalog codes', () => {
    expect(vendorDisplayName('unknown_vendor', 'zh-CN')).toBe('Unknown Vendor');
    expect(regionDisplayName('eu_west_9', 'en-US')).toBe('Eu West 9');
  });

  it('humanizes stable pricing codes without changing source identity', () => {
    expect(humanizeCode('video_output_second')).toBe('Video Output Second');
    expect(humanizeCode('llm_input_token')).toBe('Llm Input Token');
  });

  it('maps language tags to the dictionary locale', () => {
    expect(dataNameLocale('en-US')).toBe('en');
    expect(dataNameLocale('zh-CN')).toBe('zh');
    expect(dataNameLocale('zh')).toBe('zh');
    expect(dataNameLocale('ja-JP')).toBe('en');
  });
});
