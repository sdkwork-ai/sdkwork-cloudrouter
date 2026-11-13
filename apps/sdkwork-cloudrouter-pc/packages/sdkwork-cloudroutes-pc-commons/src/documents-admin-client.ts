import type {
  DocumentsAdminCategory,
  DocumentsAdminClient,
  DocumentsAdminDocument,
  DocumentsAdminOverviewItem,
  DocumentsAdminTag,
  DocumentsAdminTaxonomy,
} from '@sdkwork/documents-pc-commons';
import type {
  Document,
  DocumentCategory,
  DocumentTag,
  SdkworkDocumentsAppClient,
} from '@sdkwork/documents-app-sdk';
import { createIdempotencyParams } from './idempotency.ts';
import { getDocumentsAppSdkClient } from './documents-reference-runtime-adapter.ts';

function toAdminDocument(document: Document): DocumentsAdminDocument {
  return {
    id: document.id,
    title: document.title,
    status: document.status,
    body: document.body ?? '',
  };
}

function toAdminTag(tag: DocumentTag): DocumentsAdminTag {
  return { id: tag.id, slug: tag.slug, name: tag.name };
}

function toAdminCategory(category: DocumentCategory): DocumentsAdminCategory {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    ...(category.nameEn !== undefined ? { nameEn: category.nameEn } : {}),
    ...(category.description !== undefined ? { description: category.description } : {}),
    sortOrder: category.sortOrder,
    status: category.status,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

function toAdminTaxonomy(taxonomy: {
  category?: string;
  tags: DocumentTag[];
}): DocumentsAdminTaxonomy {
  return {
    category: taxonomy.category ?? '',
    tags: taxonomy.tags.map(toAdminTag),
  };
}

/**
 * Adapts the shared generated documents app client to the document-center
 * admin port. The portal admin and the SDKWork Documents reference app share
 * the same pages; only this adapter differs per host.
 */
export function createCloudRouterDocumentsAdminClient(): DocumentsAdminClient {
  const client = getDocumentsAppSdkClient() as unknown as SdkworkDocumentsAppClient;

  return {
    async list() {
      const page = await client.documents.list();
      return page.items.map(toAdminDocument);
    },
    async overview() {
      const page = await client.documentOverview.overview.list();
      return page.items.map((item): DocumentsAdminOverviewItem => ({
        id: item.id,
        title: item.title,
        status: item.status,
        locale: item.locale,
        slug: item.slug,
        category: item.category ?? '',
        tags: (item.tags ?? []).map(toAdminTag),
        updatedAt: item.updatedAt,
      }));
    },
    async retrieve(documentId) {
      return toAdminDocument(await client.documents.retrieve(documentId));
    },
    async create(input) {
      const document = await client.documents.create(
        { title: input.title, body: input.body ?? '' },
        createIdempotencyParams('documents-admin-create'),
      );
      return toAdminDocument(document);
    },
    async update(documentId, input) {
      return toAdminDocument(await client.documents.update(documentId, input));
    },
    async bindDrive(documentId, input) {
      return toAdminDocument(
        await client.documents.driveBinding(documentId, {
          ...(input.driveSpaceId ? { driveSpaceId: input.driveSpaceId } : {}),
          ...(input.driveNodeId ? { driveNodeId: input.driveNodeId } : {}),
        }),
      );
    },
    async delete(documentId) {
      await client.documents.delete(documentId);
    },
    async listRevisions(documentId) {
      const result = await client.revisions.list(documentId);
      return result.items.map((revision) => ({
        id: revision.id,
        documentId: revision.documentId,
        locale: revision.locale,
        slug: revision.slug,
        driveSpaceId: revision.driveSpaceId,
        driveNodeId: revision.driveNodeId,
        contentChecksumSha256: revision.contentChecksumSha256,
        contentVersion: revision.contentVersion,
        createdAt: revision.createdAt,
      }));
    },
    async getIdentity(documentId) {
      const identity = await client.documentIdentity.identity.retrieve(documentId);
      return { locale: identity.locale, slug: identity.slug };
    },
    async updateIdentity(documentId, input) {
      const identity = await client.documentIdentity.identity.update(documentId, {
        ...(input.locale ? { locale: input.locale } : {}),
        ...(input.slug ? { slug: input.slug } : {}),
      });
      return { locale: identity.locale, slug: identity.slug };
    },
    async getRevisionContent(documentId, revisionId) {
      const content = await client.revisions.retrieve(documentId, revisionId);
      return {
        revision: {
          id: content.revision.id,
          documentId: content.revision.documentId,
          locale: content.revision.locale,
          slug: content.revision.slug,
          driveSpaceId: content.revision.driveSpaceId,
          driveNodeId: content.revision.driveNodeId,
          contentChecksumSha256: content.revision.contentChecksumSha256,
          contentVersion: content.revision.contentVersion,
          createdAt: content.revision.createdAt,
        },
        body: content.body,
      };
    },
    async restoreRevision(documentId, revisionId) {
      return toAdminDocument(await client.revisions.restore(documentId, revisionId));
    },
    async listCategories() {
      const page = await client.documentCategories.categories.list();
      return page.items.map(toAdminCategory);
    },
    async createCategory(input) {
      return toAdminCategory(
        await client.documentCategories.categories.create({
          slug: input.slug,
          name: input.name,
          ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        }),
      );
    },
    async updateCategory(categoryId, input) {
      const status =
        input.status === 'active' || input.status === 'hidden' ? input.status : undefined;
      return toAdminCategory(
        await client.documentCategories.categories.update(categoryId, {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
          ...(status !== undefined ? { status } : {}),
        }),
      );
    },
    async deleteCategory(categoryId) {
      await client.documentCategories.categories.delete(categoryId);
    },
    async listTags() {
      const page = await client.documentTags.tags.list();
      return page.items.map(toAdminTag);
    },
    async getTaxonomy(documentId) {
      return toAdminTaxonomy(await client.documentTaxonomy.taxonomy.retrieve(documentId));
    },
    async updateTaxonomy(documentId, input) {
      return toAdminTaxonomy(
        await client.documentTaxonomy.taxonomy.update(documentId, {
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.tags !== undefined ? { tags: input.tags } : {}),
        }),
      );
    },
  };
}
