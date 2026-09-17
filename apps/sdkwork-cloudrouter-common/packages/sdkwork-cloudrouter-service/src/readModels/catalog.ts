import type {
  CloudRouterTransportPayload,
  ConsoleCatalogRateRow,
  PagedResult,
} from '@sdkwork/cloudrouter-contracts';
import type { CloudRouterConsolePorts, ConsoleCatalogQuery } from '@sdkwork/cloudrouter-sdk-ports';

import { readCollection, readFiniteNumber, readNonEmptyString, readRecord, toRecord } from '../read/record.js';

export function toConsoleCatalogRateRow(payload: unknown): ConsoleCatalogRateRow {
  const record = toRecord(payload);
  return {
    id: readNonEmptyString(record, ['id', 'rateId', 'modelId', 'code']) ?? 'unknown',
    vendor: readNonEmptyString(record, ['vendor', 'provider', 'vendorCode']) ?? 'unknown',
    model: readNonEmptyString(record, ['model', 'modelName', 'modelCode']) ?? 'unknown',
    inputPricePerMillionTokens: readFiniteNumber(record, [
      'inputPricePerMillionTokens',
      'inputPrice',
      'promptPrice',
    ]) ?? null,
    outputPricePerMillionTokens: readFiniteNumber(record, [
      'outputPricePerMillionTokens',
      'outputPrice',
      'completionPrice',
    ]) ?? null,
    currency: readNonEmptyString(record, ['currency', 'currencyCode']) ?? 'CNY',
    unit: readNonEmptyString(record, ['unit', 'priceUnit']) ?? '1M tokens',
  };
}

export function toConsoleCatalogPage(
  payload: CloudRouterTransportPayload,
  query: ConsoleCatalogQuery = {},
): PagedResult<ConsoleCatalogRateRow> {
  const items = readCollection(payload).map(toConsoleCatalogRateRow);
  const meta = readRecord(payload, ['page', 'pagination', 'pageInfo']) ?? {};
  const pageSize = readFiniteNumber(meta, ['pageSize', 'size', 'limit']) ?? query.pageSize ?? items.length;
  return {
    items,
    page: readFiniteNumber(meta, ['page', 'pageNumber', 'current']) ?? query.page ?? 1,
    pageSize: pageSize === 0 ? items.length : pageSize,
    total: readFiniteNumber(meta, ['total', 'totalCount', 'count']) ?? items.length,
  };
}

/** Single-call entrypoint: fetch and normalize one page of the pricing catalog. */
export async function loadConsoleCatalogPage(
  ports: Pick<CloudRouterConsolePorts, 'catalog'>,
  query: ConsoleCatalogQuery = {},
): Promise<PagedResult<ConsoleCatalogRateRow>> {
  return toConsoleCatalogPage(await ports.catalog.listPricingRates(query), query);
}
