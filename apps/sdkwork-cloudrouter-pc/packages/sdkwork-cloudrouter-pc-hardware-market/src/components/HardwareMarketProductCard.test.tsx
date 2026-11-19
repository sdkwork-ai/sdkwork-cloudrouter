import { createInstance } from 'i18next';
import { render, screen } from '@testing-library/react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';

import { hardwareMarketMessages } from '../i18n/index.ts';
import { HardwareMarketProductCard } from './HardwareMarketProductCard.tsx';
import type { HardwareMarketProductSummary } from '../services/hardwareMarketService.ts';

const i18n = createInstance();

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: { translation: hardwareMarketMessages.en },
      zh: { translation: hardwareMarketMessages.zh },
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
});

const summary: HardwareMarketProductSummary = {
  product: {
    id: 'p-a',
    productNo: 'P-A',
    categoryId: 'cat-1',
    name: 'Camera',
    title: 'Camera Pro',
    subtitle: '4K indoor camera with local AI',
    productType: 'physical',
    status: 'active',
    salesStatus: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    version: '1',
  },
  price: {
    amountMinor: '9900',
    currencyCode: 'CNY',
    exponent: '2',
    listAmountMinor: '19900',
  },
  skuCount: 2,
};

function renderCard() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <HardwareMarketProductCard summary={summary} categoryName="Cameras" locale="en-US" />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('HardwareMarketProductCard', () => {
  it('links the card to the deep-linkable product route', () => {
    renderCard();
    const link = screen.getByRole('link', { name: /View product: Camera Pro/u });
    expect(link.getAttribute('href')).toBe('/hardware-market/product/p-a');
  });

  it('renders the cheapest price, the struck-through list price, and the discount', () => {
    const { container } = renderCard();
    expect(container.textContent).toContain('99.00');
    expect(container.textContent).toContain('199.00');
    expect(container.textContent).toContain('50% off');
  });

  it('shows the category, tagline, and sellable variant count', () => {
    const { container } = renderCard();
    expect(container.textContent).toContain('Cameras');
    expect(container.textContent).toContain('4K indoor camera with local AI');
    expect(container.textContent).toContain('2 variants');
  });
});
