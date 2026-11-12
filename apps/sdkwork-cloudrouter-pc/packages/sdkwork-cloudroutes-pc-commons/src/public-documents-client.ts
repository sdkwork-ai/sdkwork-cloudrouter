import type {
  PublicDocument,
  PublicDocumentClient,
} from '@sdkwork/documents-pc-public-documents';
import type { SdkworkDocumentsAppClient } from '@sdkwork/documents-app-sdk';
import { getDocumentsAppSdkClient } from './documents-reference-runtime-adapter.ts';

function toPublicDocument(document: {
  id: string;
  slug: string;
  locale: string;
  title: string;
  summary?: string;
  body: string;
  category?: string;
  categoryName?: string;
  tags?: { id: string; slug: string; name: string }[];
  publishedAt?: string;
}): PublicDocument {
  return {
    id: document.id,
    slug: document.slug,
    locale: document.locale,
    title: document.title,
    summary: document.summary ?? '',
    body: document.body,
    category: document.category ?? '',
    categoryName: document.categoryName ?? '',
    tags: document.tags ?? [],
    publishedAt: document.publishedAt ?? '',
  };
}

/**
 * Public document delivery uses the anonymous operations on the documents app
 * SDK, so the generated transport skips credential injection automatically.
 */
export function createCloudRouterPublicDocumentsClient(): PublicDocumentClient {
  const client = getDocumentsAppSdkClient() as unknown as SdkworkDocumentsAppClient;

  return {
    async list(locale) {
      const page = await client.documents.publicList(locale ? { locale } : undefined);
      return page.items.map(toPublicDocument);
    },
    async retrieve(documentRef, locale) {
      return toPublicDocument(
        await client.documents.publicRetrieve(documentRef, locale ? { locale } : undefined),
      );
    },
  };
}
