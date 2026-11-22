// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRoutingModelGroupCatalog } from '@sdkwork/cloudrouter-pc-console-core/sdk';
import { ModelGroupsView } from './ModelGroupsView';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

const service = vi.hoisted(() => ({
  fetchModelGroupCatalog: vi.fn(),
  setModelGroupDefault: vi.fn(),
}));

vi.mock('./modelGroupService', () => service);

function catalog(): AppRoutingModelGroupCatalog {
  return {
    modalities: [
      {
        modality: 'text',
        vendors: [
          {
            vendorCode: 'openai',
            vendorName: 'OpenAI',
            models: [
              {
                model: 'gpt-4o',
                catalogKey: 'openai/gpt-4o',
                displayName: 'GPT-4o',
                vendorCode: 'openai',
                modalities: ['text'],
                defaultGroupCodes: [],
                defaultSource: null,
                groups: [
                  {
                    groupId: '10',
                    groupCode: 'default-group',
                    groupName: 'Default pool',
                    isDefault: true,
                    selected: false,
                  },
                  {
                    groupId: '20',
                    groupCode: 'backup-group',
                    groupName: 'Backup pool',
                    isDefault: false,
                    selected: false,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('ModelGroupsView', () => {
  beforeEach(() => {
    service.fetchModelGroupCatalog.mockResolvedValue(catalog());
    service.setModelGroupDefault.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('lists modalities, vendors and the groups that can serve a model', async () => {
    render(<ModelGroupsView />);
    expect((await screen.findAllByText('OpenAI')).length).toBeGreaterThan(0);
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Default pool' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Backup pool' }).length).toBeGreaterThan(0);
    expect(service.fetchModelGroupCatalog).toHaveBeenCalledWith({ modality: 'text' });
  });

  it('saves the selected model groups as an ordered accountGroups list', async () => {
    render(<ModelGroupsView />);
    const modelChips = await screen.findAllByRole('button', { name: 'Default pool' });
    // The vendor editor renders first; the last chip belongs to the model row.
    fireEvent.click(modelChips[modelChips.length - 1]);
    await waitFor(() =>
      expect(service.setModelGroupDefault).toHaveBeenCalledWith({
        scope: 'model',
        modality: 'text',
        vendorCode: 'openai',
        model: 'gpt-4o',
        accountGroups: ['default-group'],
      }),
    );
  });

  it('supports the vendor-wide bulk default', async () => {
    render(<ModelGroupsView />);
    const chips = await screen.findAllByRole('button', { name: 'Backup pool' });
    // The vendor editor renders first, then the model row.
    fireEvent.click(chips[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() =>
      expect(service.setModelGroupDefault).toHaveBeenCalledWith({
        scope: 'vendor',
        modality: 'text',
        vendorCode: 'openai',
        accountGroups: ['backup-group'],
      }),
    );
  });

  it('shows a load error when the catalog request fails', async () => {
    service.fetchModelGroupCatalog.mockRejectedValueOnce(new Error('boom'));
    render(<ModelGroupsView />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load the group catalog.',
    );
  });
});
