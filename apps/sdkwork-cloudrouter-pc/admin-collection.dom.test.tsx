// @vitest-environment jsdom

/**
 * DOM-level regression for the AI capability collection admin surfaces.
 *
 * Covers the operator flows that unit contracts cannot: list rendering, the
 * publish guard for disabled items, create-with-items, the unsaved-changes
 * guard, and the read-only system category rows.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, second?: unknown) => {
      const interpolate = (template: string, values?: Record<string, unknown>) => {
        if (!values) {
          return template;
        }
        return template.replace(/\{\{(\w+)\}\}/gu, (match, name: string) => (
          values[name] === undefined ? match : String(values[name])
        ));
      };
      if (typeof second === 'string') {
        return second;
      }
      if (second && typeof second === 'object') {
        const options = second as Record<string, unknown>;
        const template = typeof options.defaultValue === 'string' ? options.defaultValue : key;
        return interpolate(template, options);
      }
      return key;
    },
    i18n: { language: 'en-US' },
  }),
}));

const {
  CollectionService,
} = await import('./packages/sdkwork-cloudrouter-pc-admin-collection/src/collectionService.ts');
const { CollectionsAdminPage } = await import(
  './packages/sdkwork-cloudrouter-pc-admin-collection/src/pages/CollectionsPage.tsx'
);
const { CollectionCategoriesAdminPage } = await import(
  './packages/sdkwork-cloudrouter-pc-admin-collection/src/pages/CollectionCategoriesPage.tsx'
);

type AdminCollection = Awaited<ReturnType<typeof CollectionService.listCollections>>['items'][number];
type AdminCollectionCategory = Awaited<ReturnType<typeof CollectionService.listCollectionCategories>>['items'][number];

function pageInfo(totalItems: number, pageSize = 20) {
  const totalPages = Math.ceil(totalItems / pageSize);
  return {
    page: 1,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: totalPages > 1,
  };
}

function item(
  id: string,
  capabilityType: 'skill' | 'mcp' | 'agent' | 'plugin',
  capabilityKey: string,
  enabled: boolean,
) {
  return {
    id,
    collectionId: '21',
    capabilityType,
    capabilityKey,
    capabilityName: '',
    capabilityVersion: '',
    capabilityIconRef: '',
    config: {},
    sortOrder: 0,
    enabled,
    createdAt: '2026-11-28 08:00:00+00',
    updatedAt: '2026-11-28 08:00:00+00',
  };
}

function collection(overrides: Partial<AdminCollection> = {}): AdminCollection {
  return {
    id: '21',
    collectionKey: 'starter',
    name: 'Starter pack',
    summary: 'Everything a new workspace needs',
    description: '',
    iconRef: '',
    collectionKind: 'mixed',
    categoryId: null,
    categoryName: null,
    visibility: 'organization',
    publishStatus: 'published',
    publishedAt: '2026-11-28 09:00:00+00',
    itemCount: '2',
    capabilityCounts: { skill: '1', mcp: '1', agent: '0', plugin: '0' },
    tags: ['starter'],
    featured: false,
    sortOrder: 0,
    ownerUserId: '30',
    createdBy: '30',
    updatedBy: '30',
    status: 'enabled',
    latestReleaseNo: 3,
    items: [
      item('51', 'skill', 'skill:code-review', true),
      item('52', 'mcp', 'mcp:github', true),
    ],
    createdAt: '2026-11-28 08:00:00+00',
    updatedAt: '2026-11-28 08:00:00+00',
    ...overrides,
  };
}

function category(overrides: Partial<AdminCollectionCategory> = {}): AdminCollectionCategory {
  return {
    id: '11',
    categoryCode: 'general',
    name: 'General',
    description: '',
    iconRef: '',
    collectionKind: 'mixed',
    parentId: null,
    sortOrder: 0,
    status: 'enabled',
    isSystem: true,
    collectionCount: '1',
    createdAt: '2026-11-28 08:00:00+00',
    updatedAt: '2026-11-28 08:00:00+00',
    ...overrides,
  };
}

function mockCollections(items: AdminCollection[]) {
  vi.spyOn(CollectionService, 'listCollectionCategories').mockResolvedValue({
    items: [category(), category({ id: '12', categoryCode: 'frontend', name: 'Frontend', isSystem: false })],
    pageInfo: pageInfo(2),
  });
  vi.spyOn(CollectionService, 'listCollections').mockResolvedValue({
    items,
    pageInfo: pageInfo(items.length),
  });
  vi.spyOn(CollectionService, 'listCollectionReleases').mockResolvedValue({
    items: [{
      id: '41',
      releaseNo: 3,
      name: 'Starter pack',
      itemCount: '2',
      releaseStatus: 'published',
      notes: 'first release',
      publishedBy: '30',
      publishedAt: '2026-11-28 09:00:00+00',
      createdAt: '2026-11-28 09:00:00+00',
    }],
    pageInfo: pageInfo(1),
  });
}

describe('collection admin pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the collection, its status, enabled counters and latest release', async () => {
    mockCollections([collection()]);

    render(<CollectionsAdminPage />);

    expect(await screen.findByText('Starter pack')).toBeTruthy();
    expect(screen.getAllByText('published').length).toBeGreaterThan(0);
    expect(screen.getByText('Latest release #3')).toBeTruthy();
  });

  it('blocks publishing when every capability is disabled', async () => {
    mockCollections([
      collection({
        publishStatus: 'draft',
        latestReleaseNo: null,
        capabilityCounts: { skill: '0', mcp: '0', agent: '0', plugin: '0' },
        items: [
          item('51', 'skill', 'skill:code-review', false),
          item('52', 'mcp', 'mcp:github', false),
        ],
      }),
    ]);

    render(<CollectionsAdminPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/Enable at least one capability/u)).toBeTruthy();
    const confirm = within(dialog).getByRole('button', { name: 'Publish' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });

  it('creates a collection with an explicit capability item', async () => {
    mockCollections([]);
    const created = collection({ publishStatus: 'draft' });
    const createSpy = vi.spyOn(CollectionService, 'createCollection').mockResolvedValue(created);
    vi.spyOn(CollectionService, 'updateCollectionStatus').mockResolvedValue(created);

    render(<CollectionsAdminPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'New collection' }));

    const drawer = await screen.findByRole('dialog');
    fireEvent.change(within(drawer).getByLabelText(/Name/u), { target: { value: 'Starter pack' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add capability' }));
    fireEvent.change(within(drawer).getByLabelText(/Capability key/u), {
      target: { value: 'skill:code-review' },
    });
    const addButtons = within(drawer).getAllByRole('button', { name: 'Add capability' });
    fireEvent.click(addButtons[addButtons.length - 1]!);
    fireEvent.click(within(drawer).getByRole('button', { name: 'Create collection' }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });
    const payload = createSpy.mock.calls[0]![0];
    expect(payload.name).toBe('Starter pack');
    expect(payload.items?.[0]?.capabilityKey).toBe('skill:code-review');
    expect(payload.items?.[0]?.enabled).toBe(true);
  });

  it('publishes an enabled collection with release notes', async () => {
    mockCollections([
      collection({
        publishStatus: 'draft',
        latestReleaseNo: null,
        publishedAt: null,
        items: [item('51', 'skill', 'skill:code-review', true)],
      }),
    ]);
    const publishSpy = vi.spyOn(CollectionService, 'updateCollectionStatus').mockResolvedValue(
      collection({ publishStatus: 'published', latestReleaseNo: 1 }),
    );

    render(<CollectionsAdminPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));

    const dialog = await screen.findByRole('alertdialog');
    fireEvent.change(within(dialog).getByLabelText('Release notes'), {
      target: { value: 'first release' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      expect(publishSpy).toHaveBeenCalledWith('21', {
        publishStatus: 'published',
        notes: 'first release',
      });
    });
    expect(await screen.findByText('Collection published.')).toBeTruthy();
  });

  it('creates a typed category from the category dialog', async () => {
    vi.spyOn(CollectionService, 'listCollectionCategories').mockResolvedValue({
      items: [category()],
      pageInfo: pageInfo(1),
    });
    const createSpy = vi
      .spyOn(CollectionService, 'createCollectionCategory')
      .mockResolvedValue(category({
        id: '13',
        categoryCode: 'automation',
        name: 'Automation',
        collectionKind: 'skill',
        isSystem: false,
      }));

    render(<CollectionCategoriesAdminPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'New category' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Collection kind/u), {
      target: { value: 'skill' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Category code/u), {
      target: { value: 'automation' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Name/u), {
      target: { value: 'Automation' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create category' }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
        collectionKind: 'skill',
        categoryCode: 'automation',
        name: 'Automation',
      }));
    });
  });

  it('asks before discarding unsaved drawer edits', async () => {
    mockCollections([collection()]);

    render(<CollectionsAdminPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    const drawer = await screen.findByRole('dialog');
    fireEvent.change(within(drawer).getByLabelText(/Name/u), {
      target: { value: 'Starter pack v2' },
    });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Cancel' }));

    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('Discard unsaved changes?')).toBeTruthy();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('warns that saving content changes a published collection to draft', async () => {
    mockCollections([collection()]);
    const updateSpy = vi.spyOn(CollectionService, 'updateCollection').mockResolvedValue(collection({
      name: 'Starter pack v2',
      publishStatus: 'draft',
    }));

    render(<CollectionsAdminPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText(/returns this collection to draft/u)).toBeTruthy();
    fireEvent.change(within(drawer).getByLabelText(/Name/u), {
      target: { value: 'Starter pack v2' },
    });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('21', expect.objectContaining({ name: 'Starter pack v2' }));
    });
  });

  it('protects system categories and initializes the standard set', async () => {
    vi.spyOn(CollectionService, 'listCollectionCategories').mockResolvedValue({
      items: [category(), category({ id: '12', categoryCode: 'frontend', name: 'Frontend', isSystem: false })],
      pageInfo: pageInfo(2),
    });
    const initializeSpy = vi
      .spyOn(CollectionService, 'initializeCollectionCategories')
      .mockResolvedValue({
        items: [category()],
        pageInfo: pageInfo(1),
      });

    render(<CollectionCategoriesAdminPage />);

    const systemRow = (await screen.findByText('general')).closest('tr');
    expect(systemRow).toBeTruthy();
    expect(within(systemRow!).queryByRole('button', { name: 'Delete' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Initialize standard categories' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Initialize standard categories' }));

    await waitFor(() => {
      expect(initializeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
