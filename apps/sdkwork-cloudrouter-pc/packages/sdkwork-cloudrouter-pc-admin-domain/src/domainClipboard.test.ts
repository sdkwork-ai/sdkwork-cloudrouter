import { describe, expect, it, vi } from 'vitest';

import { copyToClipboard } from '../src/components/domainClipboard';

describe('copyToClipboard', () => {
  it('copies the value verbatim through the async clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const copied = await copyToClipboard('  abc-DEF_123  ', { writeText });
    expect(copied).toBe(true);
    // Verbatim: a trimmed TXT value would be copied minus its padding, which is
    // a different record to the CA.
    expect(writeText).toHaveBeenCalledWith('  abc-DEF_123  ');
  });

  it('falls back to the legacy path when the async clipboard is refused', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    const legacyCopy = vi.fn().mockReturnValue(true);
    const copied = await copyToClipboard('token-value', { writeText, legacyCopy });
    expect(copied).toBe(true);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(legacyCopy).toHaveBeenCalledWith('token-value');
  });

  it('reports failure instead of pretending the value was copied', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('blocked'));
    const copied = await copyToClipboard('token-value', {
      writeText,
      legacyCopy: () => false,
    });
    expect(copied).toBe(false);
  });

  it('refuses an empty value without touching the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const legacyCopy = vi.fn().mockReturnValue(true);
    expect(await copyToClipboard('   ', { writeText, legacyCopy })).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    expect(legacyCopy).not.toHaveBeenCalled();
  });

  it('survives a legacy path that throws', async () => {
    const copied = await copyToClipboard('token-value', {
      legacyCopy: () => {
        throw new Error('execCommand is gone');
      },
    });
    expect(copied).toBe(false);
  });

  it('has no clipboard port at all when neither API exists', async () => {
    expect(await copyToClipboard('token-value', {})).toBe(false);
  });
});
