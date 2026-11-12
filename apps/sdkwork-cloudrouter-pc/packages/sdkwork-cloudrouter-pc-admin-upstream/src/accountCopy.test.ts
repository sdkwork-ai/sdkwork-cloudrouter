import { describe, expect, it } from 'vitest';
import { ACCOUNT_NAME_MAX_LENGTH, accountCopyName } from './accountCopy';

/**
 * Guards the "复制为新建" prefill name for supplier accounts.
 *
 * The copy action opens the create form with the source account's configuration
 * pre-filled. The default name must stay recognisable as a copy and must not
 * exceed the backend `accountName.maxLength` bound, otherwise submitting the
 * pre-filled form fails validation before the operator touches anything.
 */
describe('supplier account copy naming', () => {
  it('appends the localised copy suffix', () => {
    expect(accountCopyName('OpenAI 主账号', '（副本）')).toBe('OpenAI 主账号（副本）');
    expect(accountCopyName('OpenAI primary', ' (Copy)')).toBe('OpenAI primary (Copy)');
  });

  it('keeps the suffix when the source name is empty', () => {
    expect(accountCopyName('   ', '（副本）')).toBe('（副本）');
  });

  it('truncates the source name so the suffixed name fits the backend limit', () => {
    const copyName = accountCopyName('a'.repeat(ACCOUNT_NAME_MAX_LENGTH), '（副本）');
    expect(copyName.endsWith('（副本）')).toBe(true);
    expect(copyName.length).toBeLessThanOrEqual(ACCOUNT_NAME_MAX_LENGTH);
  });
});
