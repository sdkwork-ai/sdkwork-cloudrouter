import type {
  DocumentsAdminClient,
  DocumentsAdminDocument,
  DocumentsAdminTaxonomy,
} from '@sdkwork/documents-pc-commons';
import type { Document, DocumentTag, SdkworkDocumentsAppClient } from '@sdkwork/documents-app-sdk';
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

/**
 * The generated taxonomy DTO treats `category` as optional while the admin port
 * (shared with the SDKWork Documents reference app) requires a string; an
 * unclassified document therefore projects the empty category.
 */
function toAdminTaxonomy(taxonomy: {
  category?: string;
  tags: DocumentTag[];
}): DocumentsAdminTaxonomy {
  return { category: taxonomy.category ?? '', tags: taxonomy.tags };
}

/** Narrows the port's free-form status to the generated wire union. */
function toCategoryStatus(status: string | undefined): 'active' | 'hidden' | undefined {
  if (status === 'active' || status === 'hidden') {
    return status;
  }
  return undefined;
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
      return page.items.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        locale: item.locale,
        slug: item.slug,
        category: item.category ?? '',
        tags: item.tags ?? [],
        updatedAt: item.updatedAt,
      }));
    },
    async retrieve(documentId) {
      return toAdminDocument(await client.documents.retrieve(documentId));
    },
    async create(input) {
      const document = await client.documents.create(
        {
          title: input.title,
          body: input.body ?? '',
          ...(input.locale ? { locale: input.locale } : {}),
          ...(input.slug ? { slug: input.slug } : {}),
        },
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
      const result = await client.documentCategories.categories.list();
      return result.items.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        nameEn: item.nameEn,
        description: item.description,
        sortOrder: item.sortOrder,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
    },
    async createCategory(input) {
      return client.documentCategories.categories.create(input);
    },
    async updateCategory(categoryId, input) {
      const status = toCategoryStatus(input.status);
      return client.documentCategories.categories.update(categoryId, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(status !== undefined ? { status } : {}),
      });
    },
    async deleteCategory(categoryId) {
      await client.documentCategories.categories.delete(categoryId);
    },
    async listTags() {
      const result = await client.documentTags.tags.list();
      return result.items;
    },
    async getTaxonomy(documentId) {
      return toAdminTaxonomy(
        await client.documentTaxonomy.taxonomy.retrieve(documentId),
      );
    },
    async updateTaxonomy(documentId, input) {
      return toAdminTaxonomy(
        await client.documentTaxonomy.taxonomy.update(documentId, input),
      );
    },
  };
}
