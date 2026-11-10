// 券码复制契约：复制按钮只接收受审计调用（codes.reveals.create /
// codeBatches.codeExports.create）返回的完整券码；列表页的脱敏值不经过本组件。
// 券码本体渲染为可朗读的 `<code>` 文本，复制是带行上下文名称的独立按钮。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    render(<CopyablePromotionCode code={FULL_CODE} />);

    expect(screen.getByText(MASKED_CODE)).toBeInTheDocument();
    expect(screen.queryByText(FULL_CODE)).not.toBeInTheDocument();
  });

  it('copies the full code while keeping the masked display', async () => {
    render(<CopyablePromotionCode code={FULL_CODE} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith(FULL_CODE);
    expect(screen.getByText(MASKED_CODE)).toBeInTheDocument();
  });

  it('shows the full code and uses the row-context label when revealing', () => {
    render(
      <CopyablePromotionCode code={FULL_CODE} masked={false} label="Copy full code for code WELC****0001" />,
    );

    expect(screen.getByText(FULL_CODE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy full code for code WELC****0001' })).toBeInTheDocument();
  });

  it('renders an em dash without a copy control when the code is empty', () => {
    render(<CopyablePromotionCode code="" />);

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(writeText).not.toHaveBeenCalled();
  });
});
