package api

import (
    "encoding/json"
    "fmt"
    "net/url"
    "strings"
    sdktypes "github.com/sdkwork/clawrouter-backend-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-backend-sdk/http"
)

type ServiceProvidersApi struct {
    client *sdkhttp.Client
}

func NewServiceProvidersApi(client *sdkhttp.Client) *ServiceProvidersApi {
    return &ServiceProvidersApi{client: client}
}

// Service Provider Adjustments List
func (a *ServiceProvidersApi) AdjustmentsList(page *string, pageSize *string, status *string, providerId *string, sellerProviderId *string, buyerProviderId *string, edgeId *string) (sdktypes.AdjustmentsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_id", Value: func() interface{} { if providerId == nil { return nil }; return *providerId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "seller_provider_id", Value: func() interface{} { if sellerProviderId == nil { return nil }; return *sellerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "buyer_provider_id", Value: func() interface{} { if buyerProviderId == nil { return nil }; return *buyerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "edge_id", Value: func() interface{} { if edgeId == nil { return nil }; return *edgeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/service_providers/adjustments"), query), nil, nil)
    if err != nil {
        var zero sdktypes.AdjustmentsListResult
        return zero, err
    }
    return decodeResult[sdktypes.AdjustmentsListResult](raw)
}

// Service Provider Audit Events List
func (a *ServiceProvidersApi) AuditEventsList(page *string, pageSize *string, status *string, providerId *string, sellerProviderId *string, buyerProviderId *string, edgeId *string) (sdktypes.AuditEventsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_id", Value: func() interface{} { if providerId == nil { return nil }; return *providerId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "seller_provider_id", Value: func() interface{} { if sellerProviderId == nil { return nil }; return *sellerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "buyer_provider_id", Value: func() interface{} { if buyerProviderId == nil { return nil }; return *buyerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "edge_id", Value: func() interface{} { if edgeId == nil { return nil }; return *edgeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/service_providers/audit/events"), query), nil, nil)
    if err != nil {
        var zero sdktypes.AuditEventsListResult
        return zero, err
    }
    return decodeResult[sdktypes.AuditEventsListResult](raw)
}

// Service Provider Bindings List
func (a *ServiceProvidersApi) BindingsList(page *string, pageSize *string, status *string, providerId *string, sellerProviderId *string, buyerProviderId *string, edgeId *string) (sdktypes.BindingsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_id", Value: func() interface{} { if providerId == nil { return nil }; return *providerId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "seller_provider_id", Value: func() interface{} { if sellerProviderId == nil { return nil }; return *sellerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "buyer_provider_id", Value: func() interface{} { if buyerProviderId == nil { return nil }; return *buyerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "edge_id", Value: func() interface{} { if edgeId == nil { return nil }; return *edgeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/service_providers/bindings"), query), nil, nil)
    if err != nil {
        var zero sdktypes.BindingsListResult
        return zero, err
    }
    return decodeResult[sdktypes.BindingsListResult](raw)
}

// Service Provider Contracts List
func (a *ServiceProvidersApi) ContractsList(page *string, pageSize *string, status *string, providerId *string, sellerProviderId *string, buyerProviderId *string, edgeId *string) (sdktypes.ContractsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_id", Value: func() interface{} { if providerId == nil { return nil }; return *providerId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "seller_provider_id", Value: func() interface{} { if sellerProviderId == nil { return nil }; return *sellerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "buyer_provider_id", Value: func() interface{} { if buyerProviderId == nil { return nil }; return *buyerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "edge_id", Value: func() interface{} { if edgeId == nil { return nil }; return *edgeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/service_providers/contracts"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ContractsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ContractsListResult](raw)
}

// Service Provider Dashboard Retrieve
func (a *ServiceProvidersApi) DashboardRetrieve(page *string, pageSize *string, status *string, providerId *string, sellerProviderId *string, buyerProviderId *string, edgeId *string) (sdktypes.DashboardRetrieveResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_id", Value: func() interface{} { if providerId == nil { return nil }; return *providerId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "seller_provider_id", Value: func() interface{} { if sellerProviderId == nil { return nil }; return *sellerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "buyer_provider_id", Value: func() interface{} { if buyerProviderId == nil { return nil }; return *buyerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "edge_id", Value: func() interface{} { if edgeId == nil { return nil }; return *edgeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/service_providers/dashboard"), query), nil, nil)
    if err != nil {
        var zero sdktypes.DashboardRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.DashboardRetrieveResult](raw)
}

// Service Provider Downstreams List
func (a *ServiceProvidersApi) DownstreamsList(page *string, pageSize *string, status *string, providerId *string, sellerProviderId *string, buyerProviderId *string, edgeId *string) (sdktypes.DownstreamsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_id", Value: func() interface{} { if providerId == nil { return nil }; return *providerId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "seller_provider_id", Value: func() interface{} { if sellerProviderId == nil { return nil }; return *sellerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "buyer_provider_id", Value: func() interface{} { if buyerProviderId == nil { return nil }; return *buyerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "edge_id", Value: func() interface{} { if edgeId == nil { return nil }; return *edgeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/service_providers/downstreams"), query), nil, nil)
    if err != nil {
        var zero sdktypes.DownstreamsListResult
        return zero, err
    }
    return decodeResult[sdktypes.DownstreamsListResult](raw)
}

// Service Provider Downstream Create
func (a *ServiceProvidersApi) DownstreamsCreate(body sdktypes.ServiceProviderDownstreamCreateRequest, idempotencyKey string) (sdktypes.DownstreamsCreateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Post(BackendApiPath("/service_providers/downstreams"), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.DownstreamsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.DownstreamsCreateResult](raw)
}

// Service Provider Members List
func (a *ServiceProvidersApi) MembersList(page *string, pageSize *string, status *string, providerId *string, sellerProviderId *string, buyerProviderId *string, edgeId *string) (sdktypes.MembersListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_id", Value: func() interface{} { if providerId == nil { return nil }; return *providerId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "seller_provider_id", Value: func() interface{} { if sellerProviderId == nil { return nil }; return *sellerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "buyer_provider_id", Value: func() interface{} { if buyerProviderId == nil { return nil }; return *buyerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "edge_id", Value: func() interface{} { if edgeId == nil { return nil }; return *edgeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/service_providers/members"), query), nil, nil)
    if err != nil {
        var zero sdktypes.MembersListResult
        return zero, err
    }
    return decodeResult[sdktypes.MembersListResult](raw)
}

// Service Provider Pricing Rules List
func (a *ServiceProvidersApi) PricingRulesList(page *string, pageSize *string, status *string, providerId *string, sellerProviderId *string, buyerProviderId *string, edgeId *string) (sdktypes.PricingRulesListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_id", Value: func() interface{} { if providerId == nil { return nil }; return *providerId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "seller_provider_id", Value: func() interface{} { if sellerProviderId == nil { return nil }; return *sellerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "buyer_provider_id", Value: func() interface{} { if buyerProviderId == nil { return nil }; return *buyerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "edge_id", Value: func() interface{} { if edgeId == nil { return nil }; return *edgeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/service_providers/pricing/rules"), query), nil, nil)
    if err != nil {
        var zero sdktypes.PricingRulesListResult
        return zero, err
    }
    return decodeResult[sdktypes.PricingRulesListResult](raw)
}

// Service Provider Pricing Rule Create
func (a *ServiceProvidersApi) PricingRulesCreate(body sdktypes.ServiceProviderPricingRuleCreateRequest, idempotencyKey string) (sdktypes.PricingRulesCreateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Post(BackendApiPath("/service_providers/pricing/rules"), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.PricingRulesCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.PricingRulesCreateResult](raw)
}

// Service Provider Pricing Rule Update
func (a *ServiceProvidersApi) PricingRulesUpdate(ruleId string, body sdktypes.ServiceProviderPricingRuleUpdateRequest, idempotencyKey string) (sdktypes.PricingRulesUpdateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/service_providers/pricing/rules/%s", SerializePathParameter(ruleId, PathParameterSpec{Name: "ruleId", Style: "simple", Explode: false}))), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.PricingRulesUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.PricingRulesUpdateResult](raw)
}

// Service Provider Price Simulation Create
func (a *ServiceProvidersApi) PriceSimulationCreate(body sdktypes.ServiceProviderPriceSimulationRequest, idempotencyKey string) (sdktypes.PriceSimulationCreateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Post(BackendApiPath("/service_providers/pricing/simulations"), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.PriceSimulationCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.PriceSimulationCreateResult](raw)
}

// Service Providers List
func (a *ServiceProvidersApi) ProviderRegistryList(page *string, pageSize *string, status *string, providerId *string, sellerProviderId *string, buyerProviderId *string, edgeId *string) (sdktypes.ProviderRegistryListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_id", Value: func() interface{} { if providerId == nil { return nil }; return *providerId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "seller_provider_id", Value: func() interface{} { if sellerProviderId == nil { return nil }; return *sellerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "buyer_provider_id", Value: func() interface{} { if buyerProviderId == nil { return nil }; return *buyerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "edge_id", Value: func() interface{} { if edgeId == nil { return nil }; return *edgeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/service_providers/providers"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ProviderRegistryListResult
        return zero, err
    }
    return decodeResult[sdktypes.ProviderRegistryListResult](raw)
}

// Service Provider Reconciliation Runs List
func (a *ServiceProvidersApi) ReconciliationRunsList(page *string, pageSize *string, status *string, providerId *string, sellerProviderId *string, buyerProviderId *string, edgeId *string) (sdktypes.ReconciliationRunsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_id", Value: func() interface{} { if providerId == nil { return nil }; return *providerId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "seller_provider_id", Value: func() interface{} { if sellerProviderId == nil { return nil }; return *sellerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "buyer_provider_id", Value: func() interface{} { if buyerProviderId == nil { return nil }; return *buyerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "edge_id", Value: func() interface{} { if edgeId == nil { return nil }; return *edgeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/service_providers/reconciliation_runs"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ReconciliationRunsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ReconciliationRunsListResult](raw)
}

// Service Provider Relations List
func (a *ServiceProvidersApi) RelationsList(page *string, pageSize *string, status *string, providerId *string, sellerProviderId *string, buyerProviderId *string, edgeId *string) (sdktypes.RelationsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_id", Value: func() interface{} { if providerId == nil { return nil }; return *providerId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "seller_provider_id", Value: func() interface{} { if sellerProviderId == nil { return nil }; return *sellerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "buyer_provider_id", Value: func() interface{} { if buyerProviderId == nil { return nil }; return *buyerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "edge_id", Value: func() interface{} { if edgeId == nil { return nil }; return *edgeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/service_providers/relations"), query), nil, nil)
    if err != nil {
        var zero sdktypes.RelationsListResult
        return zero, err
    }
    return decodeResult[sdktypes.RelationsListResult](raw)
}

// Service Provider Risk Events List
func (a *ServiceProvidersApi) RiskEventsList(page *string, pageSize *string, status *string, providerId *string, sellerProviderId *string, buyerProviderId *string, edgeId *string) (sdktypes.RiskEventsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_id", Value: func() interface{} { if providerId == nil { return nil }; return *providerId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "seller_provider_id", Value: func() interface{} { if sellerProviderId == nil { return nil }; return *sellerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "buyer_provider_id", Value: func() interface{} { if buyerProviderId == nil { return nil }; return *buyerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "edge_id", Value: func() interface{} { if edgeId == nil { return nil }; return *edgeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/service_providers/risk/events"), query), nil, nil)
    if err != nil {
        var zero sdktypes.RiskEventsListResult
        return zero, err
    }
    return decodeResult[sdktypes.RiskEventsListResult](raw)
}

// Service Provider Statements List
func (a *ServiceProvidersApi) StatementsList(page *string, pageSize *string, status *string, providerId *string, sellerProviderId *string, buyerProviderId *string, edgeId *string) (sdktypes.StatementsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_id", Value: func() interface{} { if providerId == nil { return nil }; return *providerId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "seller_provider_id", Value: func() interface{} { if sellerProviderId == nil { return nil }; return *sellerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "buyer_provider_id", Value: func() interface{} { if buyerProviderId == nil { return nil }; return *buyerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "edge_id", Value: func() interface{} { if edgeId == nil { return nil }; return *edgeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/service_providers/statements"), query), nil, nil)
    if err != nil {
        var zero sdktypes.StatementsListResult
        return zero, err
    }
    return decodeResult[sdktypes.StatementsListResult](raw)
}

// Service Provider Usage List
func (a *ServiceProvidersApi) UsageList(page *string, pageSize *string, status *string, providerId *string, sellerProviderId *string, buyerProviderId *string, edgeId *string) (sdktypes.UsageListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_id", Value: func() interface{} { if providerId == nil { return nil }; return *providerId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "seller_provider_id", Value: func() interface{} { if sellerProviderId == nil { return nil }; return *sellerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "buyer_provider_id", Value: func() interface{} { if buyerProviderId == nil { return nil }; return *buyerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "edge_id", Value: func() interface{} { if edgeId == nil { return nil }; return *edgeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/service_providers/usage"), query), nil, nil)
    if err != nil {
        var zero sdktypes.UsageListResult
        return zero, err
    }
    return decodeResult[sdktypes.UsageListResult](raw)
}

// Service Provider Wallet Accounts List
func (a *ServiceProvidersApi) ProviderWalletAccountsList(page *string, pageSize *string, status *string, providerId *string, sellerProviderId *string, buyerProviderId *string, edgeId *string) (sdktypes.ProviderWalletAccountsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_id", Value: func() interface{} { if providerId == nil { return nil }; return *providerId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "seller_provider_id", Value: func() interface{} { if sellerProviderId == nil { return nil }; return *sellerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "buyer_provider_id", Value: func() interface{} { if buyerProviderId == nil { return nil }; return *buyerProviderId }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "edge_id", Value: func() interface{} { if edgeId == nil { return nil }; return *edgeId }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/service_providers/wallet/accounts"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ProviderWalletAccountsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ProviderWalletAccountsListResult](raw)
}

type PathParameterSpec struct {
    Name    string
    Style   string
    Explode bool
}

func SerializePathParameter(value interface{}, spec PathParameterSpec) string {
    if value == nil {
        return ""
    }
    style := spec.Style
    if style == "" {
        style = "simple"
    }

    switch typed := value.(type) {
    case []string:
        return SerializePathArray(spec.Name, stringSliceToInterface(typed), style, spec.Explode)
    case []int:
        return SerializePathArray(spec.Name, intSliceToInterface(typed), style, spec.Explode)
    case []interface{}:
        return SerializePathArray(spec.Name, typed, style, spec.Explode)
    case map[string]string:
        return SerializePathObject(spec.Name, stringMapToInterface(typed), style, spec.Explode)
    case map[string]int:
        return SerializePathObject(spec.Name, intMapToInterface(typed), style, spec.Explode)
    case map[string]interface{}:
        return SerializePathObject(spec.Name, typed, style, spec.Explode)
    default:
        return PathPrefix(spec.Name, style) + url.PathEscape(fmt.Sprint(value))
    }
}

func SerializePathArray(name string, values []interface{}, style string, explode bool) string {
    serialized := make([]string, 0, len(values))
    for _, item := range values {
        if item != nil {
            serialized = append(serialized, url.PathEscape(fmt.Sprint(item)))
        }
    }
    if len(serialized) == 0 {
        return PathPrefix(name, style)
    }
    if style == "matrix" {
        if explode {
            parts := make([]string, 0, len(serialized))
            for _, item := range serialized {
                parts = append(parts, ";"+name+"="+item)
            }
            return strings.Join(parts, "")
        }
        return ";" + name + "=" + strings.Join(serialized, ",")
    }
    separator := ","
    if explode {
        separator = "."
    }
    return PathPrefix(name, style) + strings.Join(serialized, separator)
}

func SerializePathObject(name string, values map[string]interface{}, style string, explode bool) string {
    entries := make([]string, 0, len(values)*2)
    exploded := make([]string, 0, len(values))
    for key, value := range values {
        if value == nil {
            continue
        }
        escapedKey := url.PathEscape(key)
        escapedValue := url.PathEscape(fmt.Sprint(value))
        if explode {
            if style == "matrix" {
                exploded = append(exploded, ";"+escapedKey+"="+escapedValue)
            } else {
                exploded = append(exploded, escapedKey+"="+escapedValue)
            }
        } else {
            entries = append(entries, escapedKey, escapedValue)
        }
    }
    if style == "matrix" {
        if explode {
            return strings.Join(exploded, "")
        }
        return ";" + name + "=" + strings.Join(entries, ",")
    }
    if explode {
        separator := ","
        if style == "label" {
            separator = "."
        }
        return PathPrefix(name, style) + strings.Join(exploded, separator)
    }
    return PathPrefix(name, style) + strings.Join(entries, ",")
}

func PathPrefix(name string, style string) string {
    if style == "label" {
        return "."
    }
    if style == "matrix" {
        return ";" + name
    }
    return ""
}
type QueryParameterSpec struct {
    Name          string
    Value         interface{}
    Style         string
    Explode       bool
    AllowReserved bool
    ContentType   string
}

func BuildQueryString(parameters []QueryParameterSpec) string {
    pairs := make([]string, 0)
    for _, parameter := range parameters {
        AppendSerializedParameter(&pairs, parameter)
    }
    return strings.Join(pairs, "&")
}

func AppendSerializedParameter(pairs *[]string, parameter QueryParameterSpec) {
    if parameter.Value == nil {
        return
    }

    if parameter.ContentType != "" {
        encoded, _ := json.Marshal(parameter.Value)
        *pairs = append(*pairs, url.QueryEscape(parameter.Name)+"="+EncodeQueryValue(string(encoded), parameter.AllowReserved))
        return
    }

    style := parameter.Style
    if style == "" {
        style = "form"
    }

    switch value := parameter.Value.(type) {
    case []string:
        AppendArrayParameter(pairs, parameter.Name, stringSliceToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case []int:
        AppendArrayParameter(pairs, parameter.Name, intSliceToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case []interface{}:
        AppendArrayParameter(pairs, parameter.Name, value, style, parameter.Explode, parameter.AllowReserved)
    case map[string]int:
        AppendObjectParameter(pairs, parameter.Name, intMapToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case map[string]string:
        AppendObjectParameter(pairs, parameter.Name, stringMapToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case map[string]interface{}:
        if style == "deepObject" {
            AppendDeepObjectParameter(pairs, parameter.Name, value, parameter.AllowReserved)
        } else {
            AppendObjectParameter(pairs, parameter.Name, value, style, parameter.Explode, parameter.AllowReserved)
        }
    default:
        *pairs = append(*pairs, url.QueryEscape(parameter.Name)+"="+EncodeQueryValue(fmt.Sprint(value), parameter.AllowReserved))
    }
}

func AppendArrayParameter(pairs *[]string, name string, value []interface{}, style string, explode bool, allowReserved bool) {
    values := make([]string, 0, len(value))
    for _, item := range value {
        if item != nil {
            values = append(values, fmt.Sprint(item))
        }
    }
    if len(values) == 0 {
        return
    }
    if style == "form" && explode {
        for _, item := range values {
            *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(item, allowReserved))
        }
        return
    }
    *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(strings.Join(values, ","), allowReserved))
}

func AppendObjectParameter(pairs *[]string, name string, value map[string]interface{}, style string, explode bool, allowReserved bool) {
    entries := make([]string, 0, len(value)*2)
    for key, item := range value {
        if item == nil {
            continue
        }
        if style == "form" && explode {
            *pairs = append(*pairs, url.QueryEscape(key)+"="+EncodeQueryValue(fmt.Sprint(item), allowReserved))
            continue
        }
        entries = append(entries, key, fmt.Sprint(item))
    }
    if len(entries) == 0 {
        return
    }
    if !(style == "form" && explode) {
        *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(strings.Join(entries, ","), allowReserved))
    }
}

func AppendDeepObjectParameter(pairs *[]string, name string, value map[string]interface{}, allowReserved bool) {
    for key, item := range value {
        if item == nil {
            continue
        }
        *pairs = append(*pairs, url.QueryEscape(fmt.Sprintf("%s[%s]", name, key))+"="+EncodeQueryValue(fmt.Sprint(item), allowReserved))
    }
}

func EncodeQueryValue(value string, allowReserved bool) string {
    encoded := url.QueryEscape(value)
    if !allowReserved {
        return encoded
    }
    replacements := map[string]string{
        "%3A": ":", "%2F": "/", "%3F": "?", "%23": "#",
        "%5B": "[", "%5D": "]", "%40": "@", "%21": "!",
        "%24": "$", "%26": "&", "%27": "'", "%28": "(",
        "%29": ")", "%2A": "*", "%2B": "+", "%2C": ",",
        "%3B": ";", "%3D": "=",
    }
    for escaped, reserved := range replacements {
        encoded = strings.ReplaceAll(encoded, escaped, reserved)
    }
    return encoded
}


type ParameterSpec struct {
    Value       interface{}
    Style       string
    Explode     bool
    ContentType string
}

func BuildRequestHeaders(headers map[string]ParameterSpec, cookies map[string]ParameterSpec) map[string]string {
    requestHeaders := map[string]string{}
    for name, parameter := range headers {
        if serialized, ok := SerializeParameterValue(parameter); ok {
            requestHeaders[name] = serialized
        }
    }

    if cookieHeader := BuildCookieHeader(cookies); cookieHeader != "" {
        if existing, ok := requestHeaders["Cookie"]; ok && existing != "" {
            requestHeaders["Cookie"] = existing + "; " + cookieHeader
        } else {
            requestHeaders["Cookie"] = cookieHeader
        }
    }

    if len(requestHeaders) == 0 {
        return nil
    }
    return requestHeaders
}

func BuildCookieHeader(cookies map[string]ParameterSpec) string {
    pairs := make([]string, 0, len(cookies))
    for name, parameter := range cookies {
        if serialized, ok := SerializeParameterValue(parameter); ok {
            pairs = append(pairs, url.QueryEscape(name)+"="+url.QueryEscape(serialized))
        }
    }
    return strings.Join(pairs, "; ")
}

func SerializeParameterValue(parameter ParameterSpec) (string, bool) {
    value := parameter.Value
    if value == nil {
        return "", false
    }
    if parameter.ContentType != "" {
        encoded, _ := json.Marshal(value)
        return string(encoded), true
    }
    switch typed := value.(type) {
    case string:
        return typed, true
    case fmt.Stringer:
        return typed.String(), true
    case []string:
        return strings.Join(typed, ","), true
    case []int:
        values := make([]string, 0, len(typed))
        for _, item := range typed {
            values = append(values, fmt.Sprint(item))
        }
        return strings.Join(values, ","), true
    case map[string]string:
        return SerializeHeaderObject(stringMapToInterface(typed), parameter.Explode), true
    case map[string]int:
        return SerializeHeaderObject(intMapToInterface(typed), parameter.Explode), true
    case map[string]interface{}:
        return SerializeHeaderObject(typed, parameter.Explode), true
    default:
        return fmt.Sprint(value), true
    }
}

func SerializeHeaderObject(values map[string]interface{}, explode bool) string {
    serialized := make([]string, 0, len(values)*2)
    for key, value := range values {
        if value == nil {
            continue
        }
        if explode {
            serialized = append(serialized, key+"="+fmt.Sprint(value))
        } else {
            serialized = append(serialized, key, fmt.Sprint(value))
        }
    }
    return strings.Join(serialized, ",")
}
func stringSliceToInterface(values []string) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func intSliceToInterface(values []int) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func stringMapToInterface(values map[string]string) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}

func intMapToInterface(values map[string]int) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}
