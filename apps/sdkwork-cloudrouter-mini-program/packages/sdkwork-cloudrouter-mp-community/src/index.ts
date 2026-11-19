import {
  createCloudRouterMpCommunityAppSdkClient,
  createCloudRouterMpDriveAppSdkClient,
  resolveCloudRouterDriveMediaUrl,
  type DriveAppSdkClient,
  type SdkworkCommunityAppClient,
} from '@sdkwork/cloudrouter-mp-core';

/**
 * Community App API adapter for the WeChat mini program.
 *
 * The generated community App SDK owns transport and auth headers; this
 * adapter only flattens the wire records into the plain objects WXML can bind.
 * Every id stays a string (snowflake ids exceed the JS safe-integer range).
 */
export interface MpCommunityCircle {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  avatar: string;
  memberCount: number;
  postCount: number;
  isJoined: boolean;
  isPaid: boolean;
  price: number;
  tabs: string[];
  tags: string[];
}

export interface MpCommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  images: string[];
  createdAt: string;
  likes: number;
  comments: number;
  reviewState: string;
  tags: string[];
  firstTag: string;
}

export interface MpCommunityComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface MpCommunityMember {
  id: string;
  name: string;
  role: string;
  status: string;
  tierName: string;
}

export interface MpCommunityGroup {
  id: string;
  name: string;
  platform: string;
  description: string;
  memberCount: number;
  qrCodeCount: number;
}

export interface MpCommunityTier {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  lifetimePrice: number;
  enabled: boolean;
}

export interface CreateMpCommunityCircleInput {
  title: string;
  description: string;
  isPaid: boolean;
  price?: number;
  tags?: string[];
  tabs?: string[];
}

export interface CreateMpCommunityPostInput {
  title: string;
  body: string;
  tags?: string[];
}

type WireRecord = Record<string, unknown>;

function asRecord(value: unknown): WireRecord {
  return value && typeof value === 'object' ? (value as WireRecord) : {};
}

function pageItems(data: unknown): WireRecord[] {
  const envelope = asRecord(data);
  const payload = envelope.data ? asRecord(envelope.data) : envelope;
  const items = payload.items ?? envelope.items;
  return Array.isArray(items) ? items.map(asRecord) : [];
}

function itemRecord(data: unknown): WireRecord {
  const envelope = asRecord(data);
  const payload = envelope.data ? asRecord(envelope.data) : envelope;
  const item = payload.item ?? envelope.item;
  return item ? asRecord(item) : payload;
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function mapCircle(record: WireRecord): MpCommunityCircle {
  return {
    id: text(record.id),
    name: text(record.title),
    description: text(record.description),
    coverImage: text(record.coverImage),
    avatar: text(record.avatar),
    memberCount: number(record.memberCount),
    postCount: number(record.postCount),
    isJoined: Boolean(record.isJoined),
    isPaid: Boolean(record.isPaid),
    price: number(record.price),
    tabs: stringList(record.tabs),
    tags: stringList(record.tags),
  };
}

function mapPost(record: WireRecord): MpCommunityPost {
  const author = asRecord(record.author);
  const stats = asRecord(record.stats);
  return {
    id: text(record.id),
    authorId: text(author.id),
    authorName: text(author.name),
    authorAvatar: text(author.avatarUrl),
    content: text(record.body ?? record.excerpt ?? record.title),
    images: stringList(record.media),
    createdAt: text(record.publishedAt ?? record.lastActivityAt ?? record.createdAt),
    likes: number(stats.reactionCount),
    comments: number(stats.commentCount),
    reviewState: text(record.reviewState) || 'approved',
    tags: stringList(record.tags),
    firstTag: stringList(record.tags)[0] ?? '',
  };
}

function mapComment(record: WireRecord): MpCommunityComment {
  const author = asRecord(record.author);
  return {
    id: text(record.id),
    authorName: text(author.name),
    content: text(record.body),
    createdAt: text(record.createdAt),
  };
}

function mapMember(record: WireRecord): MpCommunityMember {
  return {
    id: text(record.id),
    name: text(record.userName),
    role: text(record.role) || 'member',
    status: text(record.status) || 'active',
    tierName: text(record.tierName),
  };
}

function mapGroup(record: WireRecord): MpCommunityGroup {
  const qrCodes = Array.isArray(record.qrCodes) ? record.qrCodes : [];
  return {
    id: text(record.id),
    name: text(record.name),
    platform: text(record.platform),
    description: text(record.description),
    memberCount: number(record.memberCount),
    qrCodeCount: qrCodes.length || (record.qrCodeUrl ? 1 : 0),
  };
}

function mapTier(record: WireRecord): MpCommunityTier {
  return {
    id: text(record.id),
    name: text(record.name),
    price: number(record.price),
    durationDays: number(record.durationDays),
    lifetimePrice: number(record.lifetimePrice),
    enabled: Boolean(record.enabled),
  };
}

// New entries are drafts until moderation approves them. Keep the author's own
// pending posts visible in the session so the composer never looks like a
// no-op; the public feed still shows them only after approval.
const PENDING_POSTS = new Map<string, MpCommunityPost[]>();

function mergePending(
  categoryId: string,
  posts: MpCommunityPost[],
  tag?: string,
): MpCommunityPost[] {
  const pending = (PENDING_POSTS.get(categoryId) ?? []).filter(
    (post) => !tag || post.tags.includes(tag),
  );
  if (pending.length === 0) {
    return posts;
  }
  const ids = new Set(posts.map((post) => post.id));
  return [...pending.filter((post) => !ids.has(post.id)), ...posts];
}

export interface MpCommunityApi {
  resolveMedia(uri: string): Promise<string | null>;
  listCircles(): Promise<MpCommunityCircle[]>;
  getCircle(categoryId: string): Promise<MpCommunityCircle | null>;
  joinCircle(categoryId: string): Promise<void>;
  leaveCircle(categoryId: string): Promise<void>;
  createCircle(input: CreateMpCommunityCircleInput): Promise<MpCommunityCircle | null>;
  updateCircle(categoryId: string, input: Partial<CreateMpCommunityCircleInput>): Promise<void>;
  deleteCircle(categoryId: string): Promise<void>;
  listPosts(categoryId: string): Promise<MpCommunityPost[]>;
  listTabPosts(categoryId: string, tag: string): Promise<MpCommunityPost[]>;
  listResources(categoryId: string): Promise<MpCommunityPost[]>;
  listComments(entryId: string): Promise<MpCommunityComment[]>;
  createPost(categoryId: string, input: CreateMpCommunityPostInput): Promise<MpCommunityPost | null>;
  deletePost(entryId: string): Promise<void>;
  addComment(entryId: string, body: string): Promise<void>;
  setReaction(entryId: string, active: boolean): Promise<void>;
  listMembers(categoryId: string): Promise<MpCommunityMember[]>;
  updateMemberRole(categoryId: string, memberId: string, role: string): Promise<void>;
  updateMemberStatus(categoryId: string, memberId: string, status: string): Promise<void>;
  removeMember(categoryId: string, memberId: string): Promise<void>;
  listGroups(categoryId: string): Promise<MpCommunityGroup[]>;
  listTiers(categoryId: string): Promise<MpCommunityTier[]>;
}

export interface CreateMpCommunityApiOptions {
  appApiBaseUrl: string;
  client?: SdkworkCommunityAppClient;
  driveClient?: DriveAppSdkClient;
}

export function createCloudRouterMpCommunityApi(
  options: CreateMpCommunityApiOptions,
): MpCommunityApi {
  const client =
    options.client
    ?? createCloudRouterMpCommunityAppSdkClient(options.appApiBaseUrl);
  const driveClient =
    options.driveClient
    ?? createCloudRouterMpDriveAppSdkClient(options.appApiBaseUrl);
  const mediaCache = new Map<string, Promise<string | null>>();

  function resolveMedia(uri: string): Promise<string | null> {
    if (!uri) return Promise.resolve(null);
    if (!uri.startsWith('drive://')) return Promise.resolve(uri);
    const cached = mediaCache.get(uri);
    if (cached) return cached;
    const pending = resolveCloudRouterDriveMediaUrl(driveClient, uri).catch(() => null);
    mediaCache.set(uri, pending);
    return pending;
  }

  async function resolveCircleMedia(circle: MpCommunityCircle): Promise<MpCommunityCircle> {
    const [avatar, coverImage] = await Promise.all([
      resolveMedia(circle.avatar),
      resolveMedia(circle.coverImage),
    ]);
    return {
      ...circle,
      avatar: avatar ?? '',
      coverImage: coverImage ?? '',
    };
  }

  async function resolvePostMedia(post: MpCommunityPost): Promise<MpCommunityPost> {
    const images = await Promise.all(post.images.map((uri) => resolveMedia(uri)));
    return {
      ...post,
      images: images.filter((uri): uri is string => Boolean(uri)),
    };
  }

  return {
    resolveMedia,

    async listCircles() {
      const page = await client.community.categories.list();
      return Promise.all(pageItems(page).map(mapCircle).map(resolveCircleMedia));
    },

    async getCircle(categoryId) {
      try {
        const record = await client.community.categories.retrieve(categoryId);
        return await resolveCircleMedia(mapCircle(itemRecord(record)));
      } catch {
        return null;
      }
    },

    async joinCircle(categoryId) {
      await client.community.categories.join(categoryId);
    },

    async leaveCircle(categoryId) {
      const current = await client.community.members.retrieve(categoryId);
      const memberId = text(itemRecord(current).id);
      if (memberId) {
        await client.community.members.delete(categoryId, memberId);
      }
    },

    async createCircle(input) {
      const created = await client.community.categories.create({
        title: input.title,
        description: input.description,
        isPaid: input.isPaid,
        price: input.price,
        tags: input.tags,
        tabs: input.tabs,
      });
      return await resolveCircleMedia(mapCircle(itemRecord(created)));
    },

    async updateCircle(categoryId, input) {
      await client.community.categories.update(categoryId, {
        ...(input.title !== undefined ? { title: input.title } : { title: '' }),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isPaid !== undefined ? { isPaid: input.isPaid } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.tabs !== undefined ? { tabs: input.tabs } : {}),
      });
    },

    async deleteCircle(categoryId) {
      await client.community.categories.delete(categoryId);
    },

    async listPosts(categoryId) {
      const page = await client.community.feed.list({ categoryId });
      const posts = pageItems(page)
        .map(mapPost)
        .filter((post) => !post.tags.includes('resource'));
      const resolved = await Promise.all(posts.map(resolvePostMedia));
      return mergePending(categoryId, resolved);
    },

    async listTabPosts(categoryId, tag) {
      const page = await client.community.feed.list({ categoryId, tag });
      const resolved = await Promise.all(pageItems(page).map(mapPost).map(resolvePostMedia));
      return mergePending(categoryId, resolved, tag);
    },

    async listResources(categoryId) {
      const page = await client.community.feed.list({ categoryId, kind: 'resource' });
      return Promise.all(pageItems(page).map(mapPost).map(resolvePostMedia));
    },

    async listComments(entryId) {
      const page = await client.community.comments.list(entryId);
      return pageItems(page).map(mapComment);
    },

    async createPost(categoryId, input) {
      const created = await client.community.entries.create({
        categoryId,
        kind: 'discussion',
        title: input.title,
        excerpt: input.body.slice(0, 240),
        body: input.body,
        tags: input.tags,
      });
      const post = mapPost(itemRecord(created));
      if (post.reviewState !== 'approved') {
        PENDING_POSTS.set(categoryId, [
          post,
          ...(PENDING_POSTS.get(categoryId) ?? []).filter((item) => item.id !== post.id),
        ]);
      }
      return post;
    },

    async deletePost(entryId) {
      await client.community.entries.delete(entryId);
      for (const [categoryId, posts] of PENDING_POSTS.entries()) {
        PENDING_POSTS.set(categoryId, posts.filter((post) => post.id !== entryId));
      }
    },

    async addComment(entryId, body) {
      await client.community.comments.create(entryId, { body });
    },

    async setReaction(entryId, active) {
      await client.community.reactions.create(entryId, { active, reactionType: 'like' });
    },

    async listMembers(categoryId) {
      const page = await client.community.members.list(categoryId);
      return pageItems(page).map(mapMember);
    },

    async updateMemberRole(categoryId, memberId, role) {
      await client.community.members.update(categoryId, memberId, { role });
    },

    async updateMemberStatus(categoryId, memberId, status) {
      await client.community.members.update(categoryId, memberId, { status });
    },

    async removeMember(categoryId, memberId) {
      await client.community.members.delete(categoryId, memberId);
    },

    async listGroups(categoryId) {
      const page = await client.community.groups.list(categoryId);
      return pageItems(page).map(mapGroup);
    },

    async listTiers(categoryId) {
      const page = await client.community.tiers.list(categoryId);
      return pageItems(page).map(mapTier);
    },
  };
}

/**
 * @internal Wire-shape regression surface. Exported only for the app-level
 * mapping tests; pages must consume the `MpCommunityApi` facade.
 */
export const __testing = {
  pageItems,
  itemRecord,
  mapCircle,
  mapPost,
  mapComment,
  mapMember,
  mapGroup,
  mapTier,
};

