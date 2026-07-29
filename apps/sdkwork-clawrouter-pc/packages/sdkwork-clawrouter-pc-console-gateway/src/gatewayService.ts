import {
  getClawRouterAppSdkClient,
  type AiGatewayTracesListParams,
  type GatewayTracesPage,
} from '@sdkwork/clawrouter-pc-console-core/sdk';

const MAX_GATEWAY_TRACES_CURSOR_LENGTH = 1024;

export class GatewayService {
  static async fetchTraces(
    options: AiGatewayTracesListParams = {},
  ): Promise<GatewayTracesPage> {
    const page = await getClawRouterAppSdkClient().ai.gateway.traces.list(options);
    validateCursorPage(page, options.cursor);
    return page;
  }
}

function validateCursorPage(page: GatewayTracesPage, requestedCursor: string | undefined): void {
  const pageInfo = page.pageInfo;
  if (pageInfo.mode !== 'cursor') {
    throw new Error('Gateway traces must use cursor pagination');
  }
  const pageSize = pageInfo.pageSize;
  if (pageSize === undefined || !Number.isInteger(pageSize)) {
    throw new Error('Gateway traces page size is required');
  }
  if (pageSize < 1 || pageSize > 200) {
    throw new Error('Gateway traces page size must be between 1 and 200');
  }
  if (typeof pageInfo.hasMore !== 'boolean') {
    throw new Error('Gateway traces hasMore is required');
  }
  const nextCursor = pageInfo.nextCursor ?? null;
  if (
    nextCursor !== null
    && (
      typeof nextCursor !== 'string'
      || nextCursor.length === 0
      || nextCursor.length > MAX_GATEWAY_TRACES_CURSOR_LENGTH
      || nextCursor.trim() !== nextCursor
    )
  ) {
    throw new Error('Gateway traces next cursor must be a non-empty opaque string');
  }
  if (pageInfo.hasMore && nextCursor === null) {
    throw new Error('Gateway traces next cursor is required when more rows are available');
  }
  if (!pageInfo.hasMore && nextCursor !== null) {
    throw new Error('Gateway traces next cursor must be empty on the final page');
  }
  if (pageInfo.hasMore && requestedCursor !== undefined && nextCursor === requestedCursor) {
    throw new Error('Gateway traces next cursor must advance');
  }
}
