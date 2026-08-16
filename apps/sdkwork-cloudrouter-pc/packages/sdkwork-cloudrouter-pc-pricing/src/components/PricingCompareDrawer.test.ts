import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { compareMeterUnit, currencySymbol } from './PricingCompareDrawer';

const t = ((key: string) => key) as TFunction;

describe('pricing compare meter units', () => {
  it('maps token meters to per-1M-token units', () => {
    expect(compareMeterUnit('llm_input_token', t)).toBe('pricing.compare.unit.perMillionTokens');
    expect(compareMeterUnit('llm_output_token', t)).toBe('pricing.compare.unit.perMillionTokens');
    expect(compareMeterUnit('video_input_token', t)).toBe('pricing.compare.unit.perMillionTokens');
  });

  it('maps character meters to per-1M-character units', () => {
    expect(compareMeterUnit('tts_input_character', t)).toBe('pricing.compare.unit.perMillionCharacters');
  });

  it('maps time meters to per-second or per-minute units', () => {
    expect(compareMeterUnit('audio_output_second', t)).toBe('pricing.compare.unit.perSecond');
    expect(compareMeterUnit('stt_audio_minute', t)).toBe('pricing.compare.unit.perMinute');
  });

  it('maps megapixel meters explicitly', () => {
    expect(compareMeterUnit('image_megapixel', t)).toBe('pricing.compare.unit.perMegapixel');
  });

  it('falls back to a generic per-unit label', () => {
    expect(compareMeterUnit('image_result', t)).toBe('pricing.compare.unit.perUnit');
    expect(compareMeterUnit('api_request', t)).toBe('pricing.compare.unit.perUnit');
  });
});

describe('pricing compare currency symbols', () => {
  it('maps ISO 4217 codes to display symbols', () => {
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('CNY')).toBe('¥');
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('GBP')).toBe('£');
    expect(currencySymbol('JPY')).toBe('¥');
    expect(currencySymbol('cny')).toBe('¥');
  });

  it('falls back to the currency code for unknown currencies', () => {
    expect(currencySymbol('XXX')).toBe('XXX');
  });
});
