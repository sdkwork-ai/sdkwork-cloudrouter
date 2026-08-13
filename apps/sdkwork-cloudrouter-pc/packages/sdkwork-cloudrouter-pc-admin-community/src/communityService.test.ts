import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSdkworkCommunityBackendSdkClient } from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import {
  createCommunityAdminCategory,
  createCommunityAdminGroup,
  createCommunityAdminTier,
  fetchCommunityAdminCategories,
  fetchCommunityAdminEntries,
  fetchCommunityAdminGroups,
  fetchCommunityAdminMembers,
  fetchCommunityAdminModerationQueue,
  fetchCommunityAdminTiers,
  updateCommunityAdminCircle,
  updateCommunityAdminModeration,
} from './communityService';

vi.mock('@sdkwork/cloudroutes-pc-commons/sdk-clients', () => ({
  getSdkworkCommunityBackendSdkClient: vi.fn(),
}));

const mockedGetBackendClient = vi.mocked(getSdkworkCommunityBackendSdkClient);

function createBackendSdkMock() {
  return {
    community: {
      categories: {
        management: { list: vi.fn() },
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      circles: { update: vi.fn() },
      entries: {
        management: { list: vi.fn() },
        moderation: { create: vi.fn() },
        feature: vi.fn(),
        pin: vi.fn(),
        delete: vi.fn(),
      },
      moderation: { queue: { list: vi.fn() } },
      recommendations: { rebuild: vi.fn() },
      members: {
        management: { list: vi.fn() },
        update: vi.fn(),
        delete: vi.fn(),
      },
      groups: {
        management: { list: vi.fn() },
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      tiers: {
        management: { list: vi.fn() },
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        publish: vi.fn(),
        unpublish: vi.fn(),
      },
    },
  };
}

type BackendSdkMock = ReturnType<typeof createBackendSdkMock>;

function envelopePage(items: unknown[]) {
  return {
    items,
    pageInfo: {
      mode: 'offset',
      page: 1,
      pageSize: 20,
      totalItems: String(items.length),
      totalPages: 1,
      hasMore: false,
    },
  };
}

function envelopeItem(item: unknown) {
  return { item };
}

function categoryPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cat-1',
    tenantId: 't1',
    slug: 'ai-dev',
    title: 'AI Developers',
    description: 'A circle',
    memberCount: '128',
    memberLimit: '500',
    postCount: '42',
    isPaid: false,
    price: 0,
    revenueRaised: 0,
    tags: ['ai'],
    tabs: ['feed'],
    priority: 1,
    enabled: true,
    isAgentCircle: false,
    isRecommended: true,
    isJoined: false,
    ...overrides,
  };
}

function memberPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm-1',
    tenantId: 't1',
    categoryId: 'cat-1',
    userId: 'u-1',
    userName: 'Alice',
    role: 'admin',
    status: 'active',
    tierId: 'tier-1',
    tierName: 'Premium',
    joinedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function groupPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'g-1',
    tenantId: 't1',
    categoryId: 'cat-1',
    name: 'WeChat group',
    platform: 'wechat',
    memberCount: '89',
    qrCodes: [{ url: 'https://example.com/qr.png', description: 'Scan' }],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

function tierPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tier-1',
    tenantId: 't1',
    categoryId: 'cat-1',
    name: 'Premium',
    price: 199,
    durationDays: '365',
    benefits: ['Exclusive posts'],
    sortOrder: '1',
    enabled: false,
    ...overrides,
  };
}

let sdkMock: BackendSdkMock;

beforeEach(() => {
  sdkMock = createBackendSdkMock();
  mockedGetBackendClient.mockReturnValue(sdkMock as never);
});

describe('fetchCommunityAdminCategories', () => {
  it('normalizes category rows with int64-as-string count fields', async () => {
    sdkMock.community.categories.management.list.mockResolvedValue(envelopePage([categoryPayload()]));
    const items = await fetchCommunityAdminCategories();
    expect(sdkMock.community.categories.management.list).toHaveBeenCalledTimes(1);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'cat-1',
      slug: 'ai-dev',
      title: 'AI Developers',
      memberCount: '128',
      memberLimit: '500',
      postCount: '42',
      isPaid: false,
      isRecommended: true,
    });
  });

  it('survives missing optional fields', async () => {
    sdkMock.community.categories.management.list.mockResolvedValue(envelopePage([
      categoryPayload({ memberLimit: undefined, price: undefined, revenueTarget: undefined }),
    ]));
    const items = await fetchCommunityAdminCategories();
    expect(items[0]!.memberLimit).toBeUndefined();
    expect(items[0]!.price).toBeUndefined();
  });
});

describe('createCommunityAdminCategory', () => {
  it('builds a camelCase request body', async () => {
    sdkMock.community.categories.create.mockResolvedValue(envelopeItem(categoryPayload()));
    const created = await createCommunityAdminCategory({
      slug: 'ai-dev',
      title: 'AI Developers',
      description: 'A circle',
      priority: 3,
      enabled: true,
    });
    expect(sdkMock.community.categories.create).toHaveBeenCalledWith({
      slug: 'ai-dev',
      title: 'AI Developers',
      description: 'A circle',
      priority: 3,
      enabled: true,
    });
    expect(created.id).toBe('cat-1');
  });

  it('rejects an invalid slug', async () => {
    await expect(createCommunityAdminCategory({ slug: 'AI DEV', title: 'X' })).rejects.toThrow(
      /lowercase slug/,
    );
    expect(sdkMock.community.categories.create).not.toHaveBeenCalled();
  });

  it('rejects a missing title', async () => {
    await expect(createCommunityAdminCategory({ slug: 'ai-dev', title: '  ' })).rejects.toThrow(
      /title is required/,
    );
  });
});

describe('updateCommunityAdminCircle', () => {
  it('converts int64 member limit to a string and keeps money as a number', async () => {
    sdkMock.community.circles.update.mockResolvedValue(envelopeItem(categoryPayload()));
    await updateCommunityAdminCircle('cat-1', {
      title: 'AI Developers',
      memberLimit: 500,
      price: 99.5,
      revenueTarget: 10000,
    });
    expect(sdkMock.community.circles.update).toHaveBeenCalledWith('cat-1', {
      title: 'AI Developers',
      description: undefined,
      coverImage: undefined,
      avatar: undefined,
      isPaid: undefined,
      memberLimit: '500',
      price: 99.5,
      revenueTarget: 10000,
      tags: undefined,
      tabs: undefined,
    });
  });
});

describe('fetchCommunityAdminEntries', () => {
  it('passes paging and filter params and surfaces pageInfo', async () => {
    sdkMock.community.entries.management.list.mockResolvedValue(envelopePage([{
      id: 'e-1',
      tenantId: 't1',
      categoryId: 'cat-1',
      author: { id: 'u-1', name: 'Alice' },
      slug: 'post-1',
      kind: 'discussion',
      title: 'Hello',
      reviewState: 'pending-review',
      stats: { commentCount: 3, reactionCount: 5, shareCount: 1, viewCount: 10 },
      tags: [],
      media: [],
      updatedAt: '2026-01-01T00:00:00Z',
    }]));
    const result = await fetchCommunityAdminEntries({
      categoryId: 'cat-1',
      kind: 'discussion',
      reviewState: 'pending-review',
      page: 2,
      pageSize: 50,
    });
    expect(sdkMock.community.entries.management.list).toHaveBeenCalledWith({
      categoryId: 'cat-1',
      kind: 'discussion',
      q: undefined,
      reviewState: 'pending-review',
      tag: undefined,
      page: 2,
      pageSize: 50,
    });
    expect(result.items[0]).toMatchObject({
      id: 'e-1',
      kind: 'discussion',
      reviewState: 'pending-review',
      commentCount: 3,
      viewCount: 10,
    });
    expect(result.pageInfo.totalItems).toBe('1');
  });

  it('rejects pageSize above 200', async () => {
    await expect(fetchCommunityAdminEntries({ pageSize: 201 })).rejects.toThrow(/pageSize/);
  });
});

describe('updateCommunityAdminModeration', () => {
  it('sends reviewState and reason', async () => {
    sdkMock.community.entries.moderation.create.mockResolvedValue(envelopeItem({
      id: 'e-1',
      tenantId: 't1',
      categoryId: 'cat-1',
      author: { id: 'u-1', name: 'Alice' },
      slug: 'post-1',
      kind: 'discussion',
      title: 'Hello',
      reviewState: 'rejected',
      stats: {},
      tags: [],
      media: [],
      updatedAt: '2026-01-01T00:00:00Z',
    }));
    await updateCommunityAdminModeration('e-1', { reviewState: 'rejected', reason: 'Spam' });
    expect(sdkMock.community.entries.moderation.create).toHaveBeenCalledWith('e-1', {
      reviewState: 'rejected',
      reason: 'Spam',
    });
  });

  it('rejects an unknown review state', async () => {
    await expect(
      updateCommunityAdminModeration('e-1', { reviewState: 'nope' as never }),
    ).rejects.toThrow(/review state/);
  });
});

describe('fetchCommunityAdminModerationQueue', () => {
  it('loads the queue through the moderation surface', async () => {
    sdkMock.community.moderation.queue.list.mockResolvedValue(envelopePage([]));
    const items = await fetchCommunityAdminModerationQueue();
    expect(sdkMock.community.moderation.queue.list).toHaveBeenCalledTimes(1);
    expect(items).toEqual([]);
  });
});

describe('members', () => {
  it('lists members with categoryId and normalizes tier fields', async () => {
    sdkMock.community.members.management.list.mockResolvedValue(envelopePage([memberPayload()]));
    const items = await fetchCommunityAdminMembers('cat-1');
    expect(sdkMock.community.members.management.list).toHaveBeenCalledWith({ categoryId: 'cat-1' });
    expect(items[0]).toMatchObject({
      id: 'm-1',
      userName: 'Alice',
      role: 'admin',
      status: 'active',
      tierName: 'Premium',
    });
  });

  it('requires a category id', async () => {
    await expect(fetchCommunityAdminMembers('  ')).rejects.toThrow(/categoryId/);
  });
});

describe('groups', () => {
  it('lists groups and normalizes QR codes', async () => {
    sdkMock.community.groups.management.list.mockResolvedValue(envelopePage([groupPayload()]));
    const items = await fetchCommunityAdminGroups('cat-1');
    expect(items[0]).toMatchObject({
      id: 'g-1',
      name: 'WeChat group',
      platform: 'wechat',
      memberCount: '89',
      qrCodes: [{ url: 'https://example.com/qr.png', description: 'Scan' }],
    });
  });

  it('creates a group with int64 member count as string', async () => {
    sdkMock.community.groups.create.mockResolvedValue(envelopeItem(groupPayload()));
    await createCommunityAdminGroup('cat-1', {
      name: 'WeChat group',
      platform: 'wechat',
      memberCount: 89,
      qrCodes: [{ url: 'https://example.com/qr.png' }],
    });
    expect(sdkMock.community.groups.create).toHaveBeenCalledWith(
      {
        name: 'WeChat group',
        platform: 'wechat',
        description: undefined,
        memberCount: '89',
        qrCodes: [{ url: 'https://example.com/qr.png', description: undefined }],
      },
      { categoryId: 'cat-1' },
    );
  });
});

describe('tiers', () => {
  it('lists tiers and keeps int64 fields as strings', async () => {
    sdkMock.community.tiers.management.list.mockResolvedValue(envelopePage([tierPayload()]));
    const items = await fetchCommunityAdminTiers('cat-1');
    expect(items[0]).toMatchObject({
      id: 'tier-1',
      name: 'Premium',
      price: 199,
      durationDays: '365',
      sortOrder: '1',
      enabled: false,
    });
  });

  it('creates a tier converting numeric int64 fields to strings', async () => {
    sdkMock.community.tiers.create.mockResolvedValue(envelopeItem(tierPayload()));
    await createCommunityAdminTier('cat-1', {
      name: 'Premium',
      price: 199,
      durationDays: 365,
      benefits: ['Exclusive posts'],
      sortOrder: 1,
    });
    expect(sdkMock.community.tiers.create).toHaveBeenCalledWith(
      {
        name: 'Premium',
        description: undefined,
        price: 199,
        durationDays: '365',
        lifetimePrice: undefined,
        benefits: ['Exclusive posts'],
        agentLevel: undefined,
        sortOrder: '1',
      },
      { categoryId: 'cat-1' },
    );
  });

  it('rejects a negative price', async () => {
    await expect(createCommunityAdminTier('cat-1', { name: 'X', price: -1 })).rejects.toThrow(/amount/);
  });
});
