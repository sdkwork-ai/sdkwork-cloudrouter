// 券码复制契约：界面按脱敏形式展示，复制到剪贴板的必须是接口返回的完整券码。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CopyablePromotionCode } from './CopyablePromotionCode';

vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return {
    useTranslation: () => ({ t }),
  };
});

const FULL_CODE = 'WELCOME2026VIP0001';
const MASKED_CODE = 'WELC****0001';

const writeText = vi.fn<(value: string) => Promise<void>>();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('CopyablePromotionCode', () => {
  it('masks the code on screen', () => {
    const { getByRole } = render(<CopyablePromotionCode code={FULL_CODE} />);

    const button = getByRole('button');
    expect(button).toHaveTextContent(MASKED_CODE);
    expect(button).not.toHaveTextContent(FULL_CODE);
  });

  it('copies the full code while keeping the masked display', async () => {
    const { getByRole } = render(<CopyablePromotionCode code={FULL_CODE} />);

    fireEvent.click(getByRole('button'));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith(FULL_CODE);
    expect(getByRole('button')).toHaveTextContent(MASKED_CODE);
  });

  it('does not copy anything when the code is empty', () => {
    const { getByRole } = render(<CopyablePromotionCode code="" />);

    fireEvent.click(getByRole('button'));

    expect(writeText).not.toHaveBeenCalled();
  });
});
