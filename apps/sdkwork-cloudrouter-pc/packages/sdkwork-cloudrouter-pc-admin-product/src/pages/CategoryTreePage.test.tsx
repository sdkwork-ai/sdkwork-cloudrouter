import i18n from 'i18next';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { productCenterAdminMessages } from '../i18n/index.ts';
import { CategoryTreePage } from './CategoryTreePage.tsx';
import type { Category, ProductCenterService } from '../productCenterService.ts';

const rootsPage: Category[] = [
  {
    id: 'c-1',
    categoryNo: 'C-1',
    name: 'Routers',
    path: '/C-1',
    depth: '1',
    isLeaf: false,
    status: 'active',
    sortOrder: '0',
    version: '1',
  } as unknown as Category,
  {
    id: 'c-2',
    categoryNo: 'C-2',
    name: 'Accessories',
    path: '/C-2',
    depth: '1',
    isLeaf: true,
    status: 'active',
    sortOrder: '1',
    version: '1',
  } as unknown as Category,
];

const childrenPage: Category[] = [
  {
    id: 'c-3',
    parentId: 'c-1',
    categoryNo: 'C-1-1',
    name: 'Mesh routers',
    path: '/C-1/C-1-1',
    depth: '2',
    isLeaf: true,
    status: 'active',
    sortOrder: '0',
    version: '1',
  } as unknown as Category,
];

type ListQuery = { page: number; pageSize: number; rootOnly?: boolean; parentId?: string };

function pageOf(items: Category[]) {
  return {
    items,
    pageInfo: { page: 1, pageSize: 200, totalItems: items.length, hasNextPage: false },
  };
}

function createStubService(listCategories: ProductCenterService['listCategories']): ProductCenterService {
  return { listCategories } as unknown as ProductCenterService;
}

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: productCenterAdminMessages.en } },
    interpolation: { escapeValue: false },
  });
});

describe('CategoryTreePage', () => {
  it('loads roots first and fetches one level per opened branch', async () => {
    const listCategories = vi.fn(async (query: ListQuery) => {
      if (query.rootOnly) {
        return pageOf(rootsPage);
      }
      if (query.parentId === 'c-1') {
        return pageOf(childrenPage);
      }
      return pageOf([]);
    });

    render(
      <I18nextProvider i18n={i18n}>
        <CategoryTreePage service={createStubService(listCategories)} />
      </I18nextProvider>,
    );

    expect(await screen.findByText('Routers')).toBeTruthy();
    expect(screen.getByText('Accessories')).toBeTruthy();
    expect(listCategories).toHaveBeenCalledTimes(1);
    expect(listCategories.mock.calls[0]?.[0]).toMatchObject({ rootOnly: true, page: 1 });

    fireEvent.click(screen.getByText('Routers'));
    const child = await screen.findByText('Mesh routers');
    expect(child).toBeTruthy();
    expect(listCategories).toHaveBeenCalledTimes(2);
    expect(listCategories.mock.calls[1]?.[0]).toMatchObject({ parentId: 'c-1' });
    expect(listCategories.mock.calls[1]?.[0].rootOnly).toBeUndefined();

    fireEvent.click(child);
    expect(await screen.findByText('Routers / Mesh routers')).toBeTruthy();
  });
});
