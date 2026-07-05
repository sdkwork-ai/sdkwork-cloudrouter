export {
  camelCase,
  capitalize,
  isBlank,
  kebabCase,
  mask,
  padEnd,
  padStart,
  repeat,
  slugify,
  snakeCase,
  trim,
  truncate,
} from '@sdkwork/utils/string';

export { defaultIfBlank } from '@sdkwork/utils/optional';

export {
  type GatewayEndpointKind,
  type GatewayEndpointSet,
  resolveGatewayEndpoint,
  resolveGatewayEndpointForKind,
  resolveGatewayEndpoints,
} from '@sdkwork/utils/gatewayEndpoint';

export {
  buildSharedGatewayToolSnippets,
  type GatewayToolSnippetInput,
  type SharedGatewayToolId,
  type SharedGatewayToolSnippetMap,
} from '@sdkwork/utils/gatewayToolSnippets';
