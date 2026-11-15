import { describe, expect, it } from 'vitest';
import { formatOriginLines, parseOriginLines } from './CorsOriginLines';

describe('parseOriginLines', () => {
  it('trims lines, drops blanks, and de-duplicates while preserving order', () => {
    expect(
      parseOriginLines(
        ' https://mall.sdkwork.com \n\nhttps://mall.sdkwork.com\nhttps://**.sdkwork.com\nhttps://*.birdcoder.com\n',
      ),
    ).toEqual([
      'https://mall.sdkwork.com',
      'https://**.sdkwork.com',
      'https://*.birdcoder.com',
    ]);
  });

  it('handles CRLF input and whitespace-only content', () => {
    expect(parseOriginLines('https://a.example.com\r\nhttps://b.example.com\r\n')).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
    expect(parseOriginLines('   \n\t\n')).toEqual([]);
  });
});

describe('formatOriginLines', () => {
  it('round-trips through the editor format', () => {
    const origins = ['https://mall.sdkwork.com', 'https://**.birdcoder.com'];
    expect(parseOriginLines(formatOriginLines(origins))).toEqual(origins);
  });

  it('renders an empty allowlist as empty text', () => {
    expect(formatOriginLines([])).toBe('');
  });
});
