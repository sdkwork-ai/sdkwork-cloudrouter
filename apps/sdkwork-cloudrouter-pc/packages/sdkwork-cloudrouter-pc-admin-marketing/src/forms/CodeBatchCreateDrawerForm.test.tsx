// 券码批次创建表单：自定义券码模式下数量由行数派生，券码需符合 4–64 位 A-Z0-9-_ 且唯一。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodeBatchCreateDrawerForm } from './CodeBatchCreateDrawerForm';
import type { CodeBatchCreateFormValues } from '../marketingService';

vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return {
    useTranslation: () => ({ t }),
  };
});

const STOCK_OPTIONS = [{ id: '42', label: 'VIP Stock' }];

afterEach(cleanup);

function renderForm() {
  const onSubmit = vi.fn<(values: CodeBatchCreateFormValues) => void>();
  const view = render(
    <CodeBatchCreateDrawerForm error={null} stockOptions={STOCK_OPTIONS} onSubmit={onSubmit} />,
  );
  const submit = () => {
    const form = view.container.querySelector('form');
    if (!(form instanceof HTMLFormElement)) {
      throw new Error('Code batch form is not rendered');
    }
    fireEvent.submit(form);
  };
  return { ...view, onSubmit, submit };
}

function switchToCustomSource() {
  fireEvent.change(screen.getByRole('combobox', { name: /batch\.form\.codeSource/u }), {
    target: { value: 'custom' },
  });
}

describe('CodeBatchCreateDrawerForm', () => {
  it('keeps the generated prefix/length flow and submits maxClaims', () => {
    const { onSubmit, submit } = renderForm();

    fireEvent.change(screen.getByRole('textbox', { name: /batch\.form\.quantity/u }), {
      target: { value: '300' },
    });
    submit();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      stockId: '42',
      codeSource: 'generated',
      quantity: '300',
      maxClaims: 1,
      codeLength: 16,
      codePrefix: '',
    }));
    expect(onSubmit.mock.calls[0][0].customCodes).toBeUndefined();
  });

  it('derives quantity from custom code lines and locks redemptions to one', () => {
    const { onSubmit, submit } = renderForm();
    switchToCustomSource();

    fireEvent.change(screen.getByRole('textbox', { name: /batch\.form\.customCodes/u }), {
      target: { value: 'welcome-2026-0001\n WELCOME-2026-0002 \r\n\r\n' },
    });
    expect(screen.getByRole('spinbutton', { name: /batch\.form\.maxClaims/u })).toBeDisabled();
    submit();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      codeSource: 'custom',
      quantity: '2',
      customCodes: ['WELCOME-2026-0001', 'WELCOME-2026-0002'],
      maxClaims: 1,
    }));
  });

  it('rejects a custom code outside the 4-64 character rule', () => {
    const { onSubmit, submit } = renderForm();
    switchToCustomSource();

    fireEvent.change(screen.getByRole('textbox', { name: /batch\.form\.customCodes/u }), {
      target: { value: 'WELCOME-2026-0001\nbad code' },
    });
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('admin.marketing.batch.form.customInvalid')).toBeInTheDocument();
  });

  it('rejects duplicate custom codes after normalization', () => {
    const { onSubmit, submit } = renderForm();
    switchToCustomSource();

    fireEvent.change(screen.getByRole('textbox', { name: /batch\.form\.customCodes/u }), {
      target: { value: 'WELCOME-2026-0001\nwelcome-2026-0001' },
    });
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('admin.marketing.batch.form.customDuplicate')).toBeInTheDocument();
  });

  it('requires at least one custom code', () => {
    const { onSubmit, submit } = renderForm();
    switchToCustomSource();

    submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('admin.marketing.batch.form.customRequired')).toBeInTheDocument();
  });
});
