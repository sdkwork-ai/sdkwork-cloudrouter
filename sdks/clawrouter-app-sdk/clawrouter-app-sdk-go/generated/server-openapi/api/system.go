package api

import (
    "fmt"
    "net/url"
    "strings"
    sdktypes "github.com/sdkwork/clawrouter-app-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-app-sdk/http"
)

type SystemApi struct {
    client *sdkhttp.Client
}

func NewSystemApi(client *sdkhttp.Client) *SystemApi {
    return &SystemApi{client: client}
}

// List
func (a *SystemApi) AfterSalesRequestsList() (sdktypes.AfterSalesRequestsListResult, error) {
    raw, err := a.client.Get(AppApiPath("/after_sales/requests"), nil, nil)
    if err != nil {
        var zero sdktypes.AfterSalesRequestsListResult
        return zero, err
    }
    return decodeResult[sdktypes.AfterSalesRequestsListResult](raw)
}

// Retrieve
func (a *SystemApi) AfterSalesRequestsRetrieve(afterSalesRequestId string) (sdktypes.AfterSalesRequestsRetrieveResult, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/after_sales/requests/%s", SerializePathParameter(afterSalesRequestId, PathParameterSpec{Name: "afterSalesRequestId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.AfterSalesRequestsRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.AfterSalesRequestsRetrieveResult](raw)
}

// List
func (a *SystemApi) AfterSalesEventsList(afterSalesRequestId string) (sdktypes.AfterSalesEventsListResult, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/after_sales/requests/%s/events", SerializePathParameter(afterSalesRequestId, PathParameterSpec{Name: "afterSalesRequestId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.AfterSalesEventsListResult
        return zero, err
    }
    return decodeResult[sdktypes.AfterSalesEventsListResult](raw)
}

// List
func (a *SystemApi) AfterSalesReturnShipmentsList(afterSalesRequestId string) (sdktypes.AfterSalesReturnShipmentsListResult, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/after_sales/requests/%s/return_shipments", SerializePathParameter(afterSalesRequestId, PathParameterSpec{Name: "afterSalesRequestId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.AfterSalesReturnShipmentsListResult
        return zero, err
    }
    return decodeResult[sdktypes.AfterSalesReturnShipmentsListResult](raw)
}

// List
func (a *SystemApi) ShopsList() (sdktypes.ShopsListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsListResult](raw)
}

// Retrieve
func (a *SystemApi) ShopsCurrentRetrieve() (sdktypes.ShopsCurrentRetrieveResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentRetrieveResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentApplicationsList() (sdktypes.ShopsCurrentApplicationsListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/applications"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentApplicationsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentApplicationsListResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentBrandAuthorizationsList() (sdktypes.ShopsCurrentBrandAuthorizationsListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/brand_authorizations"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentBrandAuthorizationsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentBrandAuthorizationsListResult](raw)
}

// Retrieve
func (a *SystemApi) ShopsCurrentBusinessHoursRetrieve() (sdktypes.ShopsCurrentBusinessHoursRetrieveResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/business_hours"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentBusinessHoursRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentBusinessHoursRetrieveResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentCategoryBindingsList() (sdktypes.ShopsCurrentCategoryBindingsListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/category_bindings"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentCategoryBindingsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentCategoryBindingsListResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentChannelsList() (sdktypes.ShopsCurrentChannelsListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/channels"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentChannelsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentChannelsListResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentCustomerServicesList() (sdktypes.ShopsCurrentCustomerServicesListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/customer_services"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentCustomerServicesListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentCustomerServicesListResult](raw)
}

// Retrieve
func (a *SystemApi) ShopsCurrentDashboardRetrieve() (sdktypes.ShopsCurrentDashboardRetrieveResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/dashboard"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentDashboardRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentDashboardRetrieveResult](raw)
}

// Retrieve
func (a *SystemApi) ShopsCurrentDepositAccountRetrieve() (sdktypes.ShopsCurrentDepositAccountRetrieveResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/deposit_account"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentDepositAccountRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentDepositAccountRetrieveResult](raw)
}

// Retrieve
func (a *SystemApi) ShopsCurrentFulfillmentProfileRetrieve() (sdktypes.ShopsCurrentFulfillmentProfileRetrieveResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/fulfillment_profile"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentFulfillmentProfileRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentFulfillmentProfileRetrieveResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentInventoryStocksList() (sdktypes.ShopsCurrentInventoryStocksListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/inventory/stocks"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentInventoryStocksListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentInventoryStocksListResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentOrdersList() (sdktypes.ShopsCurrentOrdersListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/orders"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentOrdersListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentOrdersListResult](raw)
}

// Retrieve
func (a *SystemApi) ShopsCurrentOrdersRetrieve(orderId string) (sdktypes.ShopsCurrentOrdersRetrieveResult, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/shops/current/orders/%s", SerializePathParameter(orderId, PathParameterSpec{Name: "orderId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentOrdersRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentOrdersRetrieveResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentPoliciesList() (sdktypes.ShopsCurrentPoliciesListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/policies"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentPoliciesListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentPoliciesListResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentProductsList() (sdktypes.ShopsCurrentProductsListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/products"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentProductsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentProductsListResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentQualificationsList() (sdktypes.ShopsCurrentQualificationsListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/qualifications"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentQualificationsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentQualificationsListResult](raw)
}

// Retrieve
func (a *SystemApi) ShopsCurrentReadinessRetrieve() (sdktypes.ShopsCurrentReadinessRetrieveResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/readiness"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentReadinessRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentReadinessRetrieveResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentReturnAddressesList() (sdktypes.ShopsCurrentReturnAddressesListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/return_addresses"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentReturnAddressesListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentReturnAddressesListResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentRiskSignalsList() (sdktypes.ShopsCurrentRiskSignalsListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/risk_signals"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentRiskSignalsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentRiskSignalsListResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentServiceAreasList() (sdktypes.ShopsCurrentServiceAreasListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/service_areas"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentServiceAreasListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentServiceAreasListResult](raw)
}

// Retrieve
func (a *SystemApi) ShopsCurrentSettlementProfileRetrieve() (sdktypes.ShopsCurrentSettlementProfileRetrieveResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/settlement_profile"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentSettlementProfileRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentSettlementProfileRetrieveResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentSettlementsList() (sdktypes.ShopsCurrentSettlementsListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/settlements"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentSettlementsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentSettlementsListResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentShippingTemplatesList() (sdktypes.ShopsCurrentShippingTemplatesListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/shipping_templates"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentShippingTemplatesListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentShippingTemplatesListResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentStatusEventsList() (sdktypes.ShopsCurrentStatusEventsListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/status_events"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentStatusEventsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentStatusEventsListResult](raw)
}

// List
func (a *SystemApi) ShopsCurrentVerificationsList() (sdktypes.ShopsCurrentVerificationsListResult, error) {
    raw, err := a.client.Get(AppApiPath("/shops/current/verifications"), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsCurrentVerificationsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentVerificationsListResult](raw)
}

// Retrieve
func (a *SystemApi) ShopsRetrieve(shopId string) (sdktypes.ShopsRetrieveResult, error) {
    raw, err := a.client.Get(AppApiPath(fmt.Sprintf("/shops/%s", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ShopsRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsRetrieveResult](raw)
}

// Create
func (a *SystemApi) AfterSalesRequestsCreate() (sdktypes.AfterSalesRequestsCreateResult, error) {
    raw, err := a.client.Post(AppApiPath("/system/after_sales/requests"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.AfterSalesRequestsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.AfterSalesRequestsCreateResult](raw)
}

// Update
func (a *SystemApi) AfterSalesRequestsUpdate(afterSalesRequestId string) (sdktypes.AfterSalesRequestsUpdateResult, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/system/after_sales/requests/%s", SerializePathParameter(afterSalesRequestId, PathParameterSpec{Name: "afterSalesRequestId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.AfterSalesRequestsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.AfterSalesRequestsUpdateResult](raw)
}

// Create
func (a *SystemApi) AfterSalesReturnShipmentsCreate(afterSalesRequestId string) (sdktypes.AfterSalesReturnShipmentsCreateResult, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/system/after_sales/requests/%s/return_shipments", SerializePathParameter(afterSalesRequestId, PathParameterSpec{Name: "afterSalesRequestId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.AfterSalesReturnShipmentsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.AfterSalesReturnShipmentsCreateResult](raw)
}

// Create
func (a *SystemApi) ShopsCurrentApplicationsCreate() (sdktypes.ShopsCurrentApplicationsCreateResult, error) {
    raw, err := a.client.Post(AppApiPath("/system/shops/current/applications"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentApplicationsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentApplicationsCreateResult](raw)
}

// Upsert
func (a *SystemApi) ShopsCurrentBrandAuthorizationsUpsert() (sdktypes.ShopsCurrentBrandAuthorizationsUpsertResult, error) {
    raw, err := a.client.Put(AppApiPath("/system/shops/current/brand_authorizations"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentBrandAuthorizationsUpsertResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentBrandAuthorizationsUpsertResult](raw)
}

// Update
func (a *SystemApi) ShopsCurrentBusinessHoursUpdate() (sdktypes.ShopsCurrentBusinessHoursUpdateResult, error) {
    raw, err := a.client.Patch(AppApiPath("/system/shops/current/business_hours"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentBusinessHoursUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentBusinessHoursUpdateResult](raw)
}

// Upsert
func (a *SystemApi) ShopsCurrentCategoryBindingsUpsert() (sdktypes.ShopsCurrentCategoryBindingsUpsertResult, error) {
    raw, err := a.client.Put(AppApiPath("/system/shops/current/category_bindings"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentCategoryBindingsUpsertResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentCategoryBindingsUpsertResult](raw)
}

// Update
func (a *SystemApi) ShopsCurrentChannelsUpdate(channelId string) (sdktypes.ShopsCurrentChannelsUpdateResult, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/system/shops/current/channels/%s", SerializePathParameter(channelId, PathParameterSpec{Name: "channelId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentChannelsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentChannelsUpdateResult](raw)
}

// Upsert
func (a *SystemApi) ShopsCurrentCustomerServicesUpsert() (sdktypes.ShopsCurrentCustomerServicesUpsertResult, error) {
    raw, err := a.client.Put(AppApiPath("/system/shops/current/customer_services"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentCustomerServicesUpsertResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentCustomerServicesUpsertResult](raw)
}

// Update
func (a *SystemApi) ShopsCurrentFulfillmentProfileUpdate() (sdktypes.ShopsCurrentFulfillmentProfileUpdateResult, error) {
    raw, err := a.client.Patch(AppApiPath("/system/shops/current/fulfillment_profile"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentFulfillmentProfileUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentFulfillmentProfileUpdateResult](raw)
}

// Create
func (a *SystemApi) ShopsCurrentInventoryStocksAdjustmentsCreate(stockId string) (sdktypes.ShopsCurrentInventoryStocksAdjustmentsCreateResult, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/system/shops/current/inventory/stocks/%s/adjustments", SerializePathParameter(stockId, PathParameterSpec{Name: "stockId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentInventoryStocksAdjustmentsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentInventoryStocksAdjustmentsCreateResult](raw)
}

// Create
func (a *SystemApi) ShopsCurrentOrdersFulfillmentsCreate(orderId string) (sdktypes.ShopsCurrentOrdersFulfillmentsCreateResult, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/system/shops/current/orders/%s/fulfillments", SerializePathParameter(orderId, PathParameterSpec{Name: "orderId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentOrdersFulfillmentsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentOrdersFulfillmentsCreateResult](raw)
}

// Update
func (a *SystemApi) ShopsCurrentPoliciesUpdate(policyId string) (sdktypes.ShopsCurrentPoliciesUpdateResult, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/system/shops/current/policies/%s", SerializePathParameter(policyId, PathParameterSpec{Name: "policyId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentPoliciesUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentPoliciesUpdateResult](raw)
}

// Create
func (a *SystemApi) ShopsCurrentProductsCreate() (sdktypes.ShopsCurrentProductsCreateResult, error) {
    raw, err := a.client.Post(AppApiPath("/system/shops/current/products"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentProductsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentProductsCreateResult](raw)
}

// Update
func (a *SystemApi) ShopsCurrentProductsUpdate(productId string) (sdktypes.ShopsCurrentProductsUpdateResult, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/system/shops/current/products/%s", SerializePathParameter(productId, PathParameterSpec{Name: "productId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentProductsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentProductsUpdateResult](raw)
}

// Publish
func (a *SystemApi) ShopsCurrentProductsPublish(productId string) (sdktypes.ShopsCurrentProductsPublishResult, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/system/shops/current/products/%s/publish", SerializePathParameter(productId, PathParameterSpec{Name: "productId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentProductsPublishResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentProductsPublishResult](raw)
}

// Unpublish
func (a *SystemApi) ShopsCurrentProductsUnpublish(productId string) (sdktypes.ShopsCurrentProductsUnpublishResult, error) {
    raw, err := a.client.Post(AppApiPath(fmt.Sprintf("/system/shops/current/products/%s/unpublish", SerializePathParameter(productId, PathParameterSpec{Name: "productId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentProductsUnpublishResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentProductsUnpublishResult](raw)
}

// Upsert
func (a *SystemApi) ShopsCurrentQualificationsUpsert() (sdktypes.ShopsCurrentQualificationsUpsertResult, error) {
    raw, err := a.client.Put(AppApiPath("/system/shops/current/qualifications"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentQualificationsUpsertResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentQualificationsUpsertResult](raw)
}

// Upsert
func (a *SystemApi) ShopsCurrentReturnAddressesUpsert() (sdktypes.ShopsCurrentReturnAddressesUpsertResult, error) {
    raw, err := a.client.Put(AppApiPath("/system/shops/current/return_addresses"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentReturnAddressesUpsertResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentReturnAddressesUpsertResult](raw)
}

// Create
func (a *SystemApi) ShopsCurrentServiceAreasCreate() (sdktypes.ShopsCurrentServiceAreasCreateResult, error) {
    raw, err := a.client.Post(AppApiPath("/system/shops/current/service_areas"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentServiceAreasCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentServiceAreasCreateResult](raw)
}

// Update
func (a *SystemApi) ShopsCurrentServiceAreasUpdate(serviceAreaId string) (sdktypes.ShopsCurrentServiceAreasUpdateResult, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/system/shops/current/service_areas/%s", SerializePathParameter(serviceAreaId, PathParameterSpec{Name: "serviceAreaId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentServiceAreasUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentServiceAreasUpdateResult](raw)
}

// Update
func (a *SystemApi) ShopsCurrentSettlementProfileUpdate() (sdktypes.ShopsCurrentSettlementProfileUpdateResult, error) {
    raw, err := a.client.Patch(AppApiPath("/system/shops/current/settlement_profile"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentSettlementProfileUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentSettlementProfileUpdateResult](raw)
}

// Upsert
func (a *SystemApi) ShopsCurrentShippingTemplatesUpsert() (sdktypes.ShopsCurrentShippingTemplatesUpsertResult, error) {
    raw, err := a.client.Put(AppApiPath("/system/shops/current/shipping_templates"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCurrentShippingTemplatesUpsertResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCurrentShippingTemplatesUpsertResult](raw)
}

// Retrieve
func (a *SystemApi) SiteRuntimeRetrieve() (sdktypes.SiteRuntimeRetrieveResult, error) {
    raw, err := a.client.Get(AppApiPath("/system/site/runtime"), nil, nil)
    if err != nil {
        var zero sdktypes.SiteRuntimeRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.SiteRuntimeRetrieveResult](raw)
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
