/**
 * DOM-level verification for the admin resource usage-help button/dialog.
 *
 * The header "How to use" button must open a dialog that renders the section
 * description, numbered steps, and notes, and close on the close button.
 */
// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AdminResourceHelpButton, type AdminResourceHelpContent } from '@sdkwork/cloudroutes-pc-commons';

const HELP_CONTENT: AdminResourceHelpContent = {
  title: 'Payment Channels',
  description: 'A channel binds a provider account to a payment method and scene.',
  steps: [
    'Click "Create payment channel" to add one.',
    'Select a provider account and a payment method.',
  ],
  notes: ['Lower priority value wins.'],
};

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('AdminResourceHelpButton', () => {
  it('renders the header button with the given label', () => {
    render(<AdminResourceHelpButton content={HELP_CONTENT} label="How to use" />);
    expect(screen.getByRole('button', { name: 'How to use' })).toBeTruthy();
  });

  it('opens a dialog with description, steps, and notes on click', () => {
    render(<AdminResourceHelpButton content={HELP_CONTENT} label="How to use" />);
    fireEvent.click(screen.getByRole('button', { name: 'How to use' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Payment Channels')).toBeTruthy();
    expect(screen.getByText('A channel binds a provider account to a payment method and scene.')).toBeTruthy();
    expect(screen.getByText('Click "Create payment channel" to add one.')).toBeTruthy();
    expect(screen.getByText('Select a provider account and a payment method.')).toBeTruthy();
    expect(screen.getByText('Lower priority value wins.')).toBeTruthy();
  });

  it('renders steps with numbered badges in order', () => {
    render(<AdminResourceHelpButton content={HELP_CONTENT} label="How to use" />);
    fireEvent.click(screen.getByRole('button', { name: 'How to use' }));
    const badges = screen.getAllByText(/^[0-9]+$/);
    expect(badges.map((badge) => badge.textContent)).toEqual(['1', '2']);
  });

  it('closes the dialog via the close button', () => {
    render(<AdminResourceHelpButton content={HELP_CONTENT} label="How to use" />);
    fireEvent.click(screen.getByRole('button', { name: 'How to use' }));
    // Two close affordances exist: the header X (aria-label) and the footer button.
    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('uses localized close and notes labels', () => {
    render(
      <AdminResourceHelpButton
        closeLabel="关闭"
        content={HELP_CONTENT}
        label="使用说明"
        notesLabel="注意事项"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '使用说明' }));
    expect(screen.getByText('注意事项')).toBeTruthy();
    const closeButtons = screen.getAllByRole('button', { name: '关闭' });
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
