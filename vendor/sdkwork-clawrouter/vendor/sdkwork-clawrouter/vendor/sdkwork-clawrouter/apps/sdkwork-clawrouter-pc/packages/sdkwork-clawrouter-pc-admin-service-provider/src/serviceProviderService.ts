import {
  createClientOperationToken,
  getClawRouterBackendSdkClient,
} from '@sdkwork/clawroutes-pc-commons/runtime';

type BackendServiceProviders = ReturnType<typeof getClawRouterBackendSdkClient>['serviceProviders'];
type ListParams<TList> = TList extends (params?: infer TParams) => unknown ? TParams : never;
export type ServiceProviderListParams = ListParams<BackendServiceProviders['providerRegistry']['list']>;

export type ServiceProviderDashboardItem = {
  id: string;
  status: string;
  incomeAmount: string;
  expenseAmount: string;
  marginAmount: string;
  requestCount: number;
  activeDownstreamCount: number;
  riskProviderCount: number;
};

export type ServiceProviderResourceItem = {
  id: string;
  providerNo: string;
  displayName: string;
  providerType: string;
  status: string;
  riskLevel: string;
  incomeAmount: string;
  expenseAmount: string;
  marginAmount: string;
};

export type ServiceProviderRelationItem = {
  id: string;
  edgeNo: string;
  sellerProviderId: string;
  buyerProviderId: string;
  edgeType: string;
  settlementMode: string;
  status: string;
};

export type ServiceProviderPricingRuleItem = {
  id: string;
  planCode: string;
  catalogKey: string;
  model: string;
  billingMeterCode: string;
  tokenKind: string;
  unitPrice: string;
  currency: string;
  priority: number;
};

export type ServiceProviderUsageEdgeItem = {
  id: string;
  usageFactId: string;
  sellerProviderId: string;
  buyerProviderId: string;
  billingMeterCode: string;
  tokenKind: string;
  billableQuantity: string;
  chargeAmount: string;
  currency: string;
};

export type ServiceProviderStatementItem = {
  id: string;
  statementNo: string;
  sellerProviderId: string;
  buyerProviderId: string;
  period: string;
  receivableAmount: string;
  payableAmount: string;
  currency: string;
  statementStatus: string;
};

export type ServiceProviderPriceSimulationInput = Parameters<BackendServiceProviders['priceSimulation']['create']>[0];
export type ServiceProviderDownstreamCreateInput = Parameters<BackendServiceProviders['downstreams']['create']>[0];
export type ServiceProviderPricingRuleCreateInput = Parameters<BackendServiceProviders['pricingRules']['create']>[0];
export type ServiceProviderPricingRuleUpdateInput = Parameters<BackendServiceProviders['pricingRules']['update']>[1];

export const DEFAULT_SERVICE_PROVIDER_PAGE_PARAMS = {
  page: '1',
  pageSize: '100',
} as const;

export async function backendServiceProviderDashboardRetrieve(
  params?: ListParams<BackendServiceProviders['dashboard']['retrieve']>,
) {
  return getClawRouterBackendSdkClient().serviceProviders.dashboard.retrieve(params);
}

export async function backendServiceProvidersList(
  params?: ListParams<BackendServiceProviders['providerRegistry']['list']>,
) {
  return getClawRouterBackendSdkClient().serviceProviders.providerRegistry.list(params);
}

export async function backendServiceProviderRelationsList(
  params?: ListParams<BackendServiceProviders['relations']['list']>,
) {
  return getClawRouterBackendSdkClient().serviceProviders.relations.list(params);
}

export async function backendServiceProviderDownstreamsList(
  params?: ListParams<BackendServiceProviders['downstreams']['list']>,
) {
  return getClawRouterBackendSdkClient().serviceProviders.downstreams.list(params);
}

export async function backendServiceProviderDownstreamCreate(input: ServiceProviderDownstreamCreateInput) {
  const idempotencyKey = createClientOperationToken('admin-service-provider-downstream-create');
  return getClawRouterBackendSdkClient().serviceProviders.downstreams.create(input, {
    idempotencyKey: idempotencyKey,
  });
}

export async function backendServiceProviderMembersList(
  params?: ListParams<BackendServiceProviders['members']['list']>,
) {
  return getClawRouterBackendSdkClient().serviceProviders.members.list(params);
}

export async function backendServiceProviderBindingsList(
  params?: ListParams<BackendServiceProviders['bindings']['list']>,
) {
  return getClawRouterBackendSdkClient().serviceProviders.bindings.list(params);
}

export async function backendServiceProviderContractsList(
  params?: ListParams<BackendServiceProviders['contracts']['list']>,
) {
  return getClawRouterBackendSdkClient().serviceProviders.contracts.list(params);
}

export async function backendServiceProviderPricingRulesList(
  params?: ListParams<BackendServiceProviders['pricingRules']['list']>,
) {
  return getClawRouterBackendSdkClient().serviceProviders.pricingRules.list(params);
}

export async function backendServiceProviderPricingRuleCreate(input: ServiceProviderPricingRuleCreateInput) {
  const idempotencyKey = createClientOperationToken('admin-service-provider-pricing-rule-create');
  return getClawRouterBackendSdkClient().serviceProviders.pricingRules.create(input, {
    idempotencyKey: idempotencyKey,
  });
}

export async function backendServiceProviderPricingRuleUpdate(
  ruleId: string,
  input: ServiceProviderPricingRuleUpdateInput,
) {
  const idempotencyKey = createClientOperationToken('admin-service-provider-pricing-rule-update');
  return getClawRouterBackendSdkClient().serviceProviders.pricingRules.update(ruleId, input, {
    idempotencyKey: idempotencyKey,
  });
}

export async function backendServiceProviderPriceSimulationCreate(input: ServiceProviderPriceSimulationInput) {
  const idempotencyKey = createClientOperationToken('admin-service-provider-price-simulation');
  return getClawRouterBackendSdkClient().serviceProviders.priceSimulation.create(input, {
    idempotencyKey: idempotencyKey,
  });
}

export async function backendServiceProviderUsageList(
  params?: ListParams<BackendServiceProviders['usage']['list']>,
) {
  return getClawRouterBackendSdkClient().serviceProviders.usage.list(params);
}

export async function backendServiceProviderWalletAccountsList(
  params?: ListParams<BackendServiceProviders['providerWalletAccounts']['list']>,
) {
  return getClawRouterBackendSdkClient().serviceProviders.providerWalletAccounts.list(params);
}

export async function backendServiceProviderStatementsList(
  params?: ListParams<BackendServiceProviders['statements']['list']>,
) {
  return getClawRouterBackendSdkClient().serviceProviders.statements.list(params);
}

export async function backendServiceProviderReconciliationRunsList(
  params?: ListParams<BackendServiceProviders['reconciliationRuns']['list']>,
) {
  return getClawRouterBackendSdkClient().serviceProviders.reconciliationRuns.list(params);
}

export async function backendServiceProviderAdjustmentsList(
  params?: ListParams<BackendServiceProviders['adjustments']['list']>,
) {
  return getClawRouterBackendSdkClient().serviceProviders.adjustments.list(params);
}

export async function backendServiceProviderRiskEventsList(
  params?: ListParams<BackendServiceProviders['riskEvents']['list']>,
) {
  return getClawRouterBackendSdkClient().serviceProviders.riskEvents.list(params);
}

export async function backendServiceProviderAuditEventsList(
  params?: ListParams<BackendServiceProviders['auditEvents']['list']>,
) {
  return getClawRouterBackendSdkClient().serviceProviders.auditEvents.list(params);
}
