import {
  isRecord,
  readBoolean,
  readNumber,
  readRequiredApiItem,
  readRequiredApiItems,
  readString,
  readStringArray,
  type ApiRecord,
} from '@sdkwork/cloudroutes-pc-commons/api-result';
import {
  getSdkworkCommunityBackendSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import {
  readMediaResource,
  readMediaResourceUrl,
  type CloudRouterMediaResource,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

type BackendCommunityService = ReturnType<typeof getSdkworkCommunityBackendSdkClient>['community'];

export interface CommunityAdminPageInfo {
  mode: 'offset' | 'cursor';
  page?: number;
  pageSize?: number;
  totalItems?: string;
  totalPages?: number;
  nextCursor?: string | null;
  hasMore?: boolean;
}

export interface CommunityAdminPage<T> {
  items: T[];
  pageInfo: CommunityAdminPageInfo;
}

/** Circle / category (圈子) admin row. */
export interface CommunityAdminCategoryItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  coverImage?: CloudRouterMediaResource;
  avatar?: CloudRouterMediaResource;
  ownerId?: string;
  memberCount: string;
  memberLimit?: string;
  postCount: string;
  isPaid: boolean;
  price?: number;
  revenueRaised: number;
  revenueTarget?: number;
  tags: string[];
  tabs: string[];
  priority: number;
  enabled: boolean;
  isAgentCircle: boolean;
  isRecommended: boolean;
  isJoined: boolean;
}

export interface CommunityAdminCategoryCreateInput {
  slug: string;
  title: string;
  description?: string;
  priority?: number;
  enabled?: boolean;
}

export interface CommunityAdminCircleUpdateInput {
  title: string;
  description?: string;
  coverImage?: CloudRouterMediaResource;
  avatar?: CloudRouterMediaResource;
  isPaid?: boolean;
  memberLimit?: number;
  price?: number;
  revenueTarget?: number;
  tags?: string[];
  tabs?: string[];
}

/** Entry (内容) admin row. */
export interface CommunityAdminEntryItem {
  id: string;
  categoryId: string;
  categoryLabel?: string;
  authorId: string;
  authorName: string;
  slug: string;
  kind: string;
  title: string;
  excerpt?: string;
  reviewState: string;
  isFeatured: boolean;
  isPinned: boolean;
  hasAcceptedAnswer: boolean;
  commentCount: number;
  reactionCount: number;
  shareCount: number;
  viewCount: number;
  tags: string[];
  publishedAt?: string;
  lastActivityAt?: string;
  updatedAt: string;
}

export interface CommunityAdminEntriesListParams {
  categoryId?: string;
  kind?: string;
  q?: string;
  reviewState?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export type CommunityAdminReviewState = 'approved' | 'draft' | 'flagged' | 'pending-review' | 'rejected';

export interface CommunityAdminModerationInput {
  reviewState: CommunityAdminReviewState;
  reason?: string;
}

/** Member (成员) admin row. */
export interface CommunityAdminMemberItem {
  id: string;
  userId: string;
  userName: string;
  role: string;
  status: string;
  bio?: string;
  tierId?: string;
  tierName?: string;
  membershipExpiresAt?: string;
  agentLevel?: string;
  lastOrderId?: string;
  joinedAt: string;
}

export type CommunityAdminMemberRole = 'owner' | 'admin' | 'member';

export type CommunityAdminMemberStatus = 'active' | 'muted' | 'banned';

export interface CommunityAdminMemberPatchInput {
  role?: CommunityAdminMemberRole;
  status?: CommunityAdminMemberStatus;
}

export interface CommunityAdminGroupQrInput {
  url: string;
  description?: string;
}

/** Group (群组) admin row. */
export interface CommunityAdminGroupItem {
  id: string;
  name: string;
  platform: string;
  description?: string;
  memberCount: string;
  qrCodes: CommunityAdminGroupQrInput[];
  createdAt: string;
  updatedAt: string;
}

export interface CommunityAdminGroupMutationInput {
  name: string;
  platform: string;
  description?: string;
  memberCount?: number;
  qrCodes?: CommunityAdminGroupQrInput[];
}

/** Tier (会员等级) admin row. */
export interface CommunityAdminTierItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationDays: string;
  lifetimePrice?: number;
  lifetimePackageId?: string;
  benefits: string[];
  agentLevel?: string;
  catalogPackageId?: string;
  sortOrder: string;
  enabled: boolean;
}

export interface CommunityAdminTierMutationInput {
  name: string;
  description?: string;
  price: number;
  durationDays?: number;
  lifetimePrice?: number;
  benefits?: string[];
  agentLevel?: string;
  sortOrder?: number;
}

async function backendCategoriesList() {
  return getSdkworkCommunityBackendSdkClient().community.categories.management.list();
}

async function backendCategoriesCreate(body: Parameters<BackendCommunityService['categories']['create']>[0]) {
  return getSdkworkCommunityBackendSdkClient().community.categories.create(body);
}

async function backendCategoriesUpdate(
  categoryId: string,
  body: Parameters<BackendCommunityService['categories']['update']>[1],
) {
  return getSdkworkCommunityBackendSdkClient().community.categories.update(categoryId, body);
}

async function backendCategoriesDelete(categoryId: string) {
  return getSdkworkCommunityBackendSdkClient().community.categories.delete(categoryId);
}

async function backendCirclesUpdate(
  categoryId: string,
  body: Parameters<BackendCommunityService['circles']['update']>[1],
) {
  return getSdkworkCommunityBackendSdkClient().community.circles.update(categoryId, body);
}

async function backendEntriesList(params?: Parameters<BackendCommunityService['entries']['management']['list']>[0]) {
  return getSdkworkCommunityBackendSdkClient().community.entries.management.list(params);
}

async function backendModerationUpdate(
  entryId: string,
  body: Parameters<BackendCommunityService['entries']['moderation']['create']>[1],
) {
  return getSdkworkCommunityBackendSdkClient().community.entries.moderation.create(entryId, body);
}

async function backendEntryFeature(
  entryId: string,
  body?: Parameters<BackendCommunityService['entries']['feature']>[1],
) {
  return getSdkworkCommunityBackendSdkClient().community.entries.feature(entryId, body);
}

async function backendEntryPin(
  entryId: string,
  body?: Parameters<BackendCommunityService['entries']['pin']>[1],
) {
  return getSdkworkCommunityBackendSdkClient().community.entries.pin(entryId, body);
}

async function backendEntryDelete(entryId: string) {
  return getSdkworkCommunityBackendSdkClient().community.entries.delete(entryId);
}

async function backendModerationQueueList() {
  return getSdkworkCommunityBackendSdkClient().community.moderation.queue.list();
}

async function backendRecommendationsRebuild() {
  return getSdkworkCommunityBackendSdkClient().community.recommendations.rebuild();
}

async function backendMembersList(params: Parameters<BackendCommunityService['members']['management']['list']>[0]) {
  return getSdkworkCommunityBackendSdkClient().community.members.management.list(params);
}

async function backendMembersUpdate(
  memberId: string,
  body: Parameters<BackendCommunityService['members']['update']>[1],
  params: Parameters<BackendCommunityService['members']['update']>[2],
) {
  return getSdkworkCommunityBackendSdkClient().community.members.update(memberId, body, params);
}

async function backendMembersDelete(
  memberId: string,
  params: Parameters<BackendCommunityService['members']['delete']>[1],
) {
  return getSdkworkCommunityBackendSdkClient().community.members.delete(memberId, params);
}

async function backendGroupsList(params: Parameters<BackendCommunityService['groups']['management']['list']>[0]) {
  return getSdkworkCommunityBackendSdkClient().community.groups.management.list(params);
}

async function backendGroupsCreate(
  body: Parameters<BackendCommunityService['groups']['create']>[0],
  params: Parameters<BackendCommunityService['groups']['create']>[1],
) {
  return getSdkworkCommunityBackendSdkClient().community.groups.create(body, params);
}

async function backendGroupsUpdate(
  groupId: string,
  body: Parameters<BackendCommunityService['groups']['update']>[1],
  params: Parameters<BackendCommunityService['groups']['update']>[2],
) {
  return getSdkworkCommunityBackendSdkClient().community.groups.update(groupId, body, params);
}

async function backendGroupsDelete(
  groupId: string,
  params: Parameters<BackendCommunityService['groups']['delete']>[1],
) {
  return getSdkworkCommunityBackendSdkClient().community.groups.delete(groupId, params);
}

async function backendTiersList(params: Parameters<BackendCommunityService['tiers']['management']['list']>[0]) {
  return getSdkworkCommunityBackendSdkClient().community.tiers.management.list(params);
}

async function backendTiersCreate(
  body: Parameters<BackendCommunityService['tiers']['create']>[0],
  params: Parameters<BackendCommunityService['tiers']['create']>[1],
) {
  return getSdkworkCommunityBackendSdkClient().community.tiers.create(body, params);
}

async function backendTiersUpdate(
  tierId: string,
  body: Parameters<BackendCommunityService['tiers']['update']>[1],
  params: Parameters<BackendCommunityService['tiers']['update']>[2],
) {
  return getSdkworkCommunityBackendSdkClient().community.tiers.update(tierId, body, params);
}

async function backendTiersDelete(
  tierId: string,
  params: Parameters<BackendCommunityService['tiers']['delete']>[1],
) {
  return getSdkworkCommunityBackendSdkClient().community.tiers.delete(tierId, params);
}

async function backendTiersPublish(
  tierId: string,
  params: Parameters<BackendCommunityService['tiers']['publish']>[1],
) {
  return getSdkworkCommunityBackendSdkClient().community.tiers.publish(tierId, params);
}

async function backendTiersUnpublish(
  tierId: string,
  params: Parameters<BackendCommunityService['tiers']['unpublish']>[1],
) {
  return getSdkworkCommunityBackendSdkClient().community.tiers.unpublish(tierId, params);
}

export async function fetchCommunityAdminCategories(): Promise<CommunityAdminCategoryItem[]> {
  const result = await backendCategoriesList();
  return readRequiredApiItems(result, 'Community categories could not be loaded').map(normalizeAdminCategory);
}

export async function createCommunityAdminCategory(
  input: CommunityAdminCategoryCreateInput,
): Promise<CommunityAdminCategoryItem> {
  const result = await backendCategoriesCreate(buildCategoryMutationRequest(input));
  return normalizeAdminCategory(readRequiredApiItem(result, 'Community category could not be created'));
}

export async function updateCommunityAdminCategory(
  categoryId: string,
  input: CommunityAdminCategoryCreateInput,
): Promise<CommunityAdminCategoryItem> {
  const result = await backendCategoriesUpdate(
    requiredCommunityText(categoryId, 'categoryId'),
    buildCategoryMutationRequest(input),
  );
  return normalizeAdminCategory(readRequiredApiItem(result, 'Community category could not be updated'));
}

export async function deleteCommunityAdminCategory(categoryId: string): Promise<void> {
  await backendCategoriesDelete(requiredCommunityText(categoryId, 'categoryId'));
}

export async function updateCommunityAdminCircle(
  categoryId: string,
  input: CommunityAdminCircleUpdateInput,
): Promise<CommunityAdminCategoryItem> {
  const result = await backendCirclesUpdate(
    requiredCommunityText(categoryId, 'categoryId'),
    buildCircleMutationRequest(input),
  );
  return normalizeAdminCategory(readRequiredApiItem(result, 'Community circle could not be updated'));
}

export async function fetchCommunityAdminEntries(
  params: CommunityAdminEntriesListParams = {},
): Promise<CommunityAdminPage<CommunityAdminEntryItem>> {
  const result = await backendEntriesList({
    categoryId: params.categoryId,
    kind: params.kind,
    q: params.q,
    reviewState: params.reviewState,
    tag: params.tag,
    page: requiredListPage(params.page),
    pageSize: requiredListPageSize(params.pageSize),
  });
  return {
    items: readRequiredApiItems(result, 'Community entries could not be loaded').map(normalizeAdminEntry),
    pageInfo: result.pageInfo,
  };
}

export async function updateCommunityAdminModeration(
  entryId: string,
  input: CommunityAdminModerationInput,
): Promise<CommunityAdminEntryItem> {
  const result = await backendModerationUpdate(
    requiredCommunityText(entryId, 'entryId'),
    buildModerationRequest(input),
  );
  return normalizeAdminEntry(readRequiredApiItem(result, 'Community entry moderation could not be updated'));
}

export async function setCommunityAdminEntryFeatured(entryId: string, featured: boolean): Promise<CommunityAdminEntryItem> {
  const result = await backendEntryFeature(requiredCommunityText(entryId, 'entryId'), { featured });
  return normalizeAdminEntry(readRequiredApiItem(result, 'Community entry feature state could not be updated'));
}

export async function setCommunityAdminEntryPinned(entryId: string, pinned: boolean): Promise<CommunityAdminEntryItem> {
  const result = await backendEntryPin(requiredCommunityText(entryId, 'entryId'), { pinned });
  return normalizeAdminEntry(readRequiredApiItem(result, 'Community entry pin state could not be updated'));
}

export async function deleteCommunityAdminEntry(entryId: string): Promise<void> {
  await backendEntryDelete(requiredCommunityText(entryId, 'entryId'));
}

export async function fetchCommunityAdminModerationQueue(): Promise<CommunityAdminEntryItem[]> {
  const result = await backendModerationQueueList();
  return readRequiredApiItems(result, 'Community moderation queue could not be loaded').map(normalizeAdminEntry);
}

export async function rebuildCommunityAdminRecommendations(): Promise<void> {
  await backendRecommendationsRebuild();
}

export async function fetchCommunityAdminMembers(categoryId: string): Promise<CommunityAdminMemberItem[]> {
  const result = await backendMembersList(requiredCategoryParams(categoryId));
  return readRequiredApiItems(result, 'Community members could not be loaded').map(normalizeAdminMember);
}

export async function updateCommunityAdminMember(
  categoryId: string,
  memberId: string,
  input: CommunityAdminMemberPatchInput,
): Promise<CommunityAdminMemberItem> {
  const result = await backendMembersUpdate(
    requiredCommunityText(memberId, 'memberId'),
    buildMemberPatchRequest(input),
    requiredCategoryParams(categoryId),
  );
  return normalizeAdminMember(readRequiredApiItem(result, 'Community member could not be updated'));
}

export async function removeCommunityAdminMember(categoryId: string, memberId: string): Promise<void> {
  await backendMembersDelete(
    requiredCommunityText(memberId, 'memberId'),
    requiredCategoryParams(categoryId),
  );
}

export async function fetchCommunityAdminGroups(categoryId: string): Promise<CommunityAdminGroupItem[]> {
  const result = await backendGroupsList(requiredCategoryParams(categoryId));
  return readRequiredApiItems(result, 'Community groups could not be loaded').map(normalizeAdminGroup);
}

export async function createCommunityAdminGroup(
  categoryId: string,
  input: CommunityAdminGroupMutationInput,
): Promise<CommunityAdminGroupItem> {
  const result = await backendGroupsCreate(
    buildGroupMutationRequest(input),
    requiredCategoryParams(categoryId),
  );
  return normalizeAdminGroup(readRequiredApiItem(result, 'Community group could not be created'));
}

export async function updateCommunityAdminGroup(
  categoryId: string,
  groupId: string,
  input: CommunityAdminGroupMutationInput,
): Promise<CommunityAdminGroupItem> {
  const result = await backendGroupsUpdate(
    requiredCommunityText(groupId, 'groupId'),
    buildGroupMutationRequest(input),
    requiredCategoryParams(categoryId),
  );
  return normalizeAdminGroup(readRequiredApiItem(result, 'Community group could not be updated'));
}

export async function deleteCommunityAdminGroup(categoryId: string, groupId: string): Promise<void> {
  await backendGroupsDelete(
    requiredCommunityText(groupId, 'groupId'),
    requiredCategoryParams(categoryId),
  );
}

export async function fetchCommunityAdminTiers(categoryId: string): Promise<CommunityAdminTierItem[]> {
  const result = await backendTiersList(requiredCategoryParams(categoryId));
  return readRequiredApiItems(result, 'Community tiers could not be loaded').map(normalizeAdminTier);
}

export async function createCommunityAdminTier(
  categoryId: string,
  input: CommunityAdminTierMutationInput,
): Promise<CommunityAdminTierItem> {
  const result = await backendTiersCreate(
    buildTierMutationRequest(input),
    requiredCategoryParams(categoryId),
  );
  return normalizeAdminTier(readRequiredApiItem(result, 'Community tier could not be created'));
}

export async function updateCommunityAdminTier(
  categoryId: string,
  tierId: string,
  input: CommunityAdminTierMutationInput,
): Promise<CommunityAdminTierItem> {
  const result = await backendTiersUpdate(
    requiredCommunityText(tierId, 'tierId'),
    buildTierMutationRequest(input),
    requiredCategoryParams(categoryId),
  );
  return normalizeAdminTier(readRequiredApiItem(result, 'Community tier could not be updated'));
}

export async function deleteCommunityAdminTier(categoryId: string, tierId: string): Promise<void> {
  await backendTiersDelete(
    requiredCommunityText(tierId, 'tierId'),
    requiredCategoryParams(categoryId),
  );
}

export async function publishCommunityAdminTier(categoryId: string, tierId: string): Promise<CommunityAdminTierItem> {
  const result = await backendTiersPublish(
    requiredCommunityText(tierId, 'tierId'),
    requiredCategoryParams(categoryId),
  );
  return normalizeAdminTier(readRequiredApiItem(result, 'Community tier could not be published'));
}

export async function unpublishCommunityAdminTier(categoryId: string, tierId: string): Promise<CommunityAdminTierItem> {
  const result = await backendTiersUnpublish(
    requiredCommunityText(tierId, 'tierId'),
    requiredCategoryParams(categoryId),
  );
  return normalizeAdminTier(readRequiredApiItem(result, 'Community tier could not be unpublished'));
}

function normalizeAdminCategory(value: unknown): CommunityAdminCategoryItem {
  const item = isRecord(value) ? value as ApiRecord : {} as ApiRecord;
  const description = readString(item, 'description').trim();
  const memberLimit = readString(item, 'memberLimit').trim();
  return {
    id: requireRecordString(item, 'id', 'Community category id is required'),
    slug: requireRecordString(item, 'slug', 'Community category slug is required'),
    title: requireRecordString(item, 'title', 'Community category title is required'),
    description: description || undefined,
    coverImage: readMediaResource(item['coverImage']),
    avatar: readMediaResource(item['avatar']),
    ownerId: readString(item, 'ownerId').trim() || undefined,
    memberCount: readString(item, 'memberCount').trim() || '0',
    memberLimit: memberLimit || undefined,
    postCount: readString(item, 'postCount').trim() || '0',
    isPaid: readBoolean(item, 'isPaid'),
    price: optionalNumber(item, 'price'),
    revenueRaised: readNumber(item, 'revenueRaised', 0),
    revenueTarget: optionalNumber(item, 'revenueTarget'),
    tags: readStringArray(item, 'tags'),
    tabs: readStringArray(item, 'tabs'),
    priority: readNumber(item, 'priority', 0),
    enabled: readBoolean(item, 'enabled', true),
    isAgentCircle: readBoolean(item, 'isAgentCircle'),
    isRecommended: readBoolean(item, 'isRecommended'),
    isJoined: readBoolean(item, 'isJoined'),
  };
}

function normalizeAdminEntry(value: unknown): CommunityAdminEntryItem {
  const item = isRecord(value) ? value as ApiRecord : {} as ApiRecord;
  const author = isRecord(item['author']) ? item['author'] as ApiRecord : {};
  const stats = isRecord(item['stats']) ? item['stats'] as ApiRecord : {};
  return {
    id: requireRecordString(item, 'id', 'Community entry id is required'),
    categoryId: readString(item, 'categoryId').trim(),
    categoryLabel: readString(item, 'categoryLabel').trim() || undefined,
    authorId: readString(author, 'id').trim(),
    authorName: readString(author, 'name').trim(),
    slug: readString(item, 'slug').trim(),
    kind: readString(item, 'kind').trim() || 'discussion',
    title: requireRecordString(item, 'title', 'Community entry title is required'),
    excerpt: readString(item, 'excerpt').trim() || undefined,
    reviewState: readString(item, 'reviewState').trim() || 'draft',
    isFeatured: readBoolean(item, 'isFeatured'),
    isPinned: readBoolean(item, 'isPinned'),
    hasAcceptedAnswer: readBoolean(item, 'hasAcceptedAnswer'),
    commentCount: readNumber(stats, 'commentCount', 0),
    reactionCount: readNumber(stats, 'reactionCount', 0),
    shareCount: readNumber(stats, 'shareCount', 0),
    viewCount: readNumber(stats, 'viewCount', 0),
    tags: readStringArray(item, 'tags'),
    publishedAt: readString(item, 'publishedAt').trim() || undefined,
    lastActivityAt: readString(item, 'lastActivityAt').trim() || undefined,
    updatedAt: readString(item, 'updatedAt').trim(),
  };
}

function normalizeAdminMember(value: unknown): CommunityAdminMemberItem {
  const item = isRecord(value) ? value as ApiRecord : {} as ApiRecord;
  return {
    id: requireRecordString(item, 'id', 'Community member id is required'),
    userId: readString(item, 'userId').trim(),
    userName: requireRecordString(item, 'userName', 'Community member name is required'),
    role: readString(item, 'role').trim() || 'member',
    status: readString(item, 'status').trim() || 'active',
    bio: readString(item, 'bio').trim() || undefined,
    tierId: readString(item, 'tierId').trim() || undefined,
    tierName: readString(item, 'tierName').trim() || undefined,
    membershipExpiresAt: readString(item, 'membershipExpiresAt').trim() || undefined,
    agentLevel: readString(item, 'agentLevel').trim() || undefined,
    lastOrderId: readString(item, 'lastOrderId').trim() || undefined,
    joinedAt: readString(item, 'joinedAt').trim(),
  };
}

function normalizeAdminGroup(value: unknown): CommunityAdminGroupItem {
  const item = isRecord(value) ? value as ApiRecord : {} as ApiRecord;
  const qrCodes = Array.isArray(item['qrCodes'])
    ? item['qrCodes'].filter(isRecord).map((qr) => ({
      url: readString(qr, 'url').trim(),
      description: readString(qr, 'description').trim() || undefined,
    }))
    : [];
  return {
    id: requireRecordString(item, 'id', 'Community group id is required'),
    name: requireRecordString(item, 'name', 'Community group name is required'),
    platform: readString(item, 'platform').trim(),
    description: readString(item, 'description').trim() || undefined,
    memberCount: readString(item, 'memberCount').trim() || '0',
    qrCodes,
    createdAt: readString(item, 'createdAt').trim(),
    updatedAt: readString(item, 'updatedAt').trim(),
  };
}

function normalizeAdminTier(value: unknown): CommunityAdminTierItem {
  const item = isRecord(value) ? value as ApiRecord : {} as ApiRecord;
  return {
    id: requireRecordString(item, 'id', 'Community tier id is required'),
    name: requireRecordString(item, 'name', 'Community tier name is required'),
    description: readString(item, 'description').trim() || undefined,
    price: readNumber(item, 'price', 0),
    durationDays: readString(item, 'durationDays').trim() || '0',
    lifetimePrice: optionalNumber(item, 'lifetimePrice'),
    lifetimePackageId: readString(item, 'lifetimePackageId').trim() || undefined,
    benefits: readStringArray(item, 'benefits'),
    agentLevel: readString(item, 'agentLevel').trim() || undefined,
    catalogPackageId: readString(item, 'catalogPackageId').trim() || undefined,
    sortOrder: readString(item, 'sortOrder').trim() || '0',
    enabled: readBoolean(item, 'enabled', true),
  };
}

function buildCategoryMutationRequest(input: CommunityAdminCategoryCreateInput) {
  return {
    slug: requiredCommunitySlug(input.slug, 'slug'),
    title: requiredCommunityText(input.title, 'title'),
    description: optionalBoundedText(input.description),
    priority: input.priority === undefined ? undefined : requiredNonNegativeInteger(input.priority, 'priority'),
    enabled: input.enabled,
  };
}

function buildCircleMutationRequest(input: CommunityAdminCircleUpdateInput) {
  return {
    title: requiredCommunityText(input.title, 'title'),
    description: optionalBoundedText(input.description),
    coverImage: readMediaResourceUrl(input.coverImage),
    avatar: readMediaResourceUrl(input.avatar),
    isPaid: input.isPaid,
    memberLimit: optionalNonNegativeInt64String(input.memberLimit, 'memberLimit'),
    price: optionalMoneyNumber(input.price, 'price'),
    revenueTarget: optionalMoneyNumber(input.revenueTarget, 'revenueTarget'),
    tags: optionalStringArray(input.tags),
    tabs: optionalStringArray(input.tabs),
  };
}

function buildModerationRequest(input: CommunityAdminModerationInput) {
  return {
    reviewState: requiredReviewState(input.reviewState, 'reviewState'),
    reason: optionalBoundedText(input.reason),
  };
}

function buildMemberPatchRequest(input: CommunityAdminMemberPatchInput) {
  return {
    role: input.role,
    status: input.status,
  };
}

function buildGroupMutationRequest(input: CommunityAdminGroupMutationInput) {
  return {
    name: requiredCommunityText(input.name, 'name'),
    platform: requiredCommunityText(input.platform, 'platform'),
    description: optionalBoundedText(input.description),
    memberCount: optionalNonNegativeInt64String(input.memberCount, 'memberCount'),
    qrCodes: optionalQrCodes(input.qrCodes),
  };
}

function buildTierMutationRequest(input: CommunityAdminTierMutationInput) {
  return {
    name: requiredCommunityText(input.name, 'name'),
    description: optionalBoundedText(input.description),
    price: requiredMoneyNumber(input.price, 'price'),
    durationDays: optionalNonNegativeInt64String(input.durationDays, 'durationDays'),
    lifetimePrice: optionalMoneyNumber(input.lifetimePrice, 'lifetimePrice'),
    benefits: optionalStringArray(input.benefits),
    agentLevel: optionalBoundedText(input.agentLevel),
    sortOrder: input.sortOrder === undefined ? undefined : String(requiredNonNegativeInteger(input.sortOrder, 'sortOrder')),
  };
}

function requiredCategoryParams(categoryId: string): { categoryId: string } {
  return { categoryId: requiredCommunityText(categoryId, 'categoryId') };
}

function requiredCommunityText(value: string | undefined, fieldName: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}

function requiredCommunitySlug(value: string | undefined, fieldName: string): string {
  const normalized = requiredCommunityText(value, fieldName);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new Error(`${fieldName} must be a lowercase slug (letters, numbers, dashes)`);
  }
  return normalized;
}

function requiredReviewState(value: string | undefined, fieldName: string): CommunityAdminReviewState {
  const normalized = requiredCommunityText(value, fieldName).toLowerCase();
  if (
    normalized === 'approved'
    || normalized === 'draft'
    || normalized === 'flagged'
    || normalized === 'pending-review'
    || normalized === 'rejected'
  ) {
    return normalized;
  }
  throw new Error(`${fieldName} must be a valid review state`);
}

function requiredNonNegativeInteger(value: number | undefined, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
  return value;
}

function requiredListPage(value: number | undefined): number {
  return requiredPositiveInteger(value ?? 1, 'page');
}

function requiredListPageSize(value: number | undefined): number {
  const pageSize = requiredPositiveInteger(value ?? 20, 'pageSize');
  if (pageSize > 200) {
    throw new Error('pageSize must not exceed 200');
  }
  return pageSize;
}

function requiredPositiveInteger(value: number | undefined, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return value;
}

function requiredMoneyNumber(value: number | undefined, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative amount`);
  }
  return Math.round(value * 100) / 100;
}

function optionalMoneyNumber(value: number | undefined, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return requiredMoneyNumber(value, fieldName);
}

function optionalNonNegativeInt64String(value: number | undefined, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return String(requiredNonNegativeInteger(value, fieldName));
}

function optionalBoundedText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function optionalStringArray(value: string[] | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  return normalized.length > 0 ? normalized : undefined;
}

function optionalQrCodes(value: CommunityAdminGroupQrInput[] | undefined) {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value
    .filter((entry) => entry.url.trim().length > 0)
    .map((entry) => ({
      url: requiredCommunityText(entry.url, 'qrCodes.url'),
      description: optionalBoundedText(entry.description),
    }));
  return normalized.length > 0 ? normalized : undefined;
}

function requireRecordString(record: ApiRecord, key: string, message: string): string {
  const value = readString(record, key).trim();
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function optionalNumber(record: ApiRecord, key: string): number | undefined {
  const raw = record[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const parsed = Number.parseFloat(raw.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}
