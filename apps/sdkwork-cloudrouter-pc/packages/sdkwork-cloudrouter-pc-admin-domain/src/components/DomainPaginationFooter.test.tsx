// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DomainPaginationFooter } from './DomainPaginationFooter';

vi.mock('react-i18next', () => {
  const translate = (
    key: string,
    fallbackOrOptions?: string | { defaultValue?: string },
    options?: Record<string, unknown>,
  ): string => {
    const optionsObject =
      fallbackOrOptions && typeof fallbackOrOptions === 'object' ? fallbackOrOptions : options;
    let template = key;
    if (typeof fallbackOrOptions === 'string') {
      template = fallbackOrOptions;
    } else if (typeof fallbackOrOptions?.defaultValue === 'string') {
      template = fallbackOrOptions.defaultValue;
    }
    return Object.entries(optionsObject ?? {}).reduce(
      (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
      template,
    );
  };
  return { useTranslation: () => ({ t: translate }) };
});

afterEach(cleanup);

function renderFooter(overrides: Partial<Parameters<typeof DomainPaginationFooter>[0]> = {}) {
  const handlers = {
    onPreviousPage: vi.fn(),
    onNextPage: vi.fn(),
    onPageSelect: vi.fn(),
    onPageSizeChange: vi.fn(),
  };
  render(
    <DomainPaginationFooter
      page={3}
      pageSize={20}
      pageRowCount={20}
      totalItems={137}
      totalPages={7}
      hasMore
      totalSummary="137 root domains"
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
}

describe('DomainPaginationFooter', () => {
  it('states the total, the page window, and the current page in one line', () => {
    renderFooter();

    expect(screen.getByText(/137 root domains/u)).toBeInTheDocument();
    expect(screen.getByText(/41 - 60/u)).toBeInTheDocument();
    expect(screen.getByText('Page 3 / 7')).toBeInTheDocument();
  });

  it('marks the current page and jumps straight to a numbered page', () => {
    const handlers = renderFooter();

    const current = screen.getByRole('button', { name: 'Page 3' });
    expect(current).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('button', { name: 'Page 5' }));
    expect(handlers.onPageSelect).toHaveBeenCalledWith(5);
  });

  it('clamps a typed page into the page range instead of erroring', () => {
    const handlers = renderFooter();

    fireEvent.change(screen.getByLabelText('Go to page'), { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));

    expect(handlers.onPageSelect).toHaveBeenCalledWith(7);
  });

  it('turns Enter in the jump box into a page change', () => {
    const handlers = renderFooter();
    const input = screen.getByLabelText('Go to page');

    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(handlers.onPageSelect).toHaveBeenCalledWith(2);
  });

  it('disables previous and next at the edges, and hides the numbered strip for one page', () => {
    renderFooter({ page: 1, hasMore: false, totalPages: 1, totalItems: 4, pageRowCount: 4 });

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Page 1' })).toBeNull();
    expect(screen.queryByLabelText('Go to page')).toBeNull();
    expect(screen.getByText('Page 1')).toBeInTheDocument();
  });

  it('reports a rows-per-page change, and locks the whole bar while a page is in flight', () => {
    const handlers = renderFooter();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '50' } });
    expect(handlers.onPageSizeChange).toHaveBeenCalledWith(50);

    cleanup();
    renderFooter({ disabled: true });
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Page 5' })).toBeDisabled();
    expect(screen.getByLabelText('Go to page')).toBeDisabled();
  });
});
