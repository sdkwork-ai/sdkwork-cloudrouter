// ConfirmDialog 遮罩交互契约：点击遮罩（弹窗外）关闭，closeOnClickOutside={false} 可禁用
// 运行：pnpm --dir packages/sdkwork-cloudroutes-pc-commons exec vitest run src/components/ConfirmDialog.test.tsx
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return {
    useTranslation: () => ({ t }),
  };
});

function renderDialog(closeOnClickOutside?: boolean) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const { container } = render(
    <ConfirmDialog
      title="Delete item"
      description="This cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
      closeOnClickOutside={closeOnClickOutside}
    />,
  );
  const backdrop = container.querySelector('.fixed.inset-0') as HTMLElement;
  const panel = container.querySelector('[role="alertdialog"]') as HTMLElement;
  return { onConfirm, onCancel, backdrop, panel };
}

afterEach(() => {
  cleanup();
});

describe('ConfirmDialog click-outside', () => {
  it('calls onCancel when the backdrop is clicked', () => {
    const { onCancel, backdrop } = renderDialog();
    fireEvent.pointerDown(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not call onCancel when clicking inside the panel', () => {
    const { onCancel, panel } = renderDialog();
    fireEvent.pointerDown(panel);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('does not close on backdrop click when closeOnClickOutside is false', () => {
    const { onCancel, backdrop } = renderDialog(false);
    fireEvent.pointerDown(backdrop);
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe('ConfirmDialog children', () => {
  it('renders custom children below the description', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { getByLabelText, getByText } = render(
      <ConfirmDialog
        title="Delete item"
        description="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={onConfirm}
        onCancel={onCancel}
      >
        <label>
          <input type="checkbox" aria-label="also remove from groups" />
          Also remove from groups
        </label>
      </ConfirmDialog>,
    );
    expect(getByLabelText('also remove from groups')).toBeInTheDocument();
    expect(getByText('Also remove from groups')).toBeInTheDocument();
  });
});
