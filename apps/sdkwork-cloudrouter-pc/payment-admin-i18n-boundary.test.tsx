/**
 * DOM-level verification for PaymentAdminI18nBoundary portal localization.
 *
 * Radix Dialog/Select content renders into `document.body` through portals,
 * outside the boundary root. The boundary must still localize that content
 * from the payment admin catalog, while leaving non-portal body content
 * (owned by other surfaces) untouched.
 */
// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SdkworkI18nProvider } from '@sdkwork/i18n-pc-react';
import {
  PAYMENT_ADMIN_I18N_CATALOG,
  PaymentAdminI18nBoundary,
} from '@sdkwork/payment-pc-admin-core';

async function flushMutations() {
  // MutationObserver callbacks are delivered asynchronously.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

function renderBoundaryZh() {
  return render(
    <SdkworkI18nProvider catalogs={[PAYMENT_ADMIN_I18N_CATALOG]} locale="zh-CN">
      <PaymentAdminI18nBoundary>
        <span>Provider accounts</span>
      </PaymentAdminI18nBoundary>
    </SdkworkI18nProvider>,
  );
}

describe('PaymentAdminI18nBoundary portal localization', () => {
  it('localizes text inside the boundary root on mount', () => {
    const { container } = renderBoundaryZh();
    expect(container.textContent).toContain('支付机构账户');
  });

  it('localizes Radix portal dialog content appended to document.body', async () => {
    renderBoundaryZh();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.textContent = 'Edit provider account';
    document.body.appendChild(dialog);
    await flushMutations();
    expect(dialog.textContent).toBe('编辑支付机构账户');
  });

  it('localizes placeholder attributes inside portal content', async () => {
    renderBoundaryZh();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const input = document.createElement('input');
    input.placeholder = 'Select partner account...';
    dialog.appendChild(input);
    document.body.appendChild(dialog);
    await flushMutations();
    expect(input.placeholder).toBe('选择合作伙伴账户...');
  });

  it('localizes Select popover portal content (role=listbox)', async () => {
    renderBoundaryZh();
    const listbox = document.createElement('div');
    listbox.setAttribute('role', 'listbox');
    listbox.textContent = 'Direct (merchant self-connection)';
    document.body.appendChild(listbox);
    await flushMutations();
    expect(listbox.textContent).toBe('直连（商户自主接入）');
  });

  it('leaves non-portal body content untouched', async () => {
    renderBoundaryZh();
    const plain = document.createElement('div');
    plain.textContent = 'Provider accounts';
    document.body.appendChild(plain);
    await flushMutations();
    expect(plain.textContent).toBe('Provider accounts');
  });
});
