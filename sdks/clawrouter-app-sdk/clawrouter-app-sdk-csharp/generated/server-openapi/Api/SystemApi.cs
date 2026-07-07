using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.App.Models;
using SdkHttpClient = Sdkwork.ClawRouter.App.Http.HttpClient;

namespace Sdkwork.ClawRouter.App.Api
{
    public class SystemApi
    {
        private readonly SdkHttpClient _client;

        public SystemApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.AfterSalesRequestsListResult?> AfterSalesRequestsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.AfterSalesRequestsListResult>(ApiPaths.AppPath("/after_sales/requests"));
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.AfterSalesRequestsRetrieveResult?> AfterSalesRequestsRetrieveAsync(string afterSalesRequestId)
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.AfterSalesRequestsRetrieveResult>(ApiPaths.AppPath($"/after_sales/requests/{SerializePathParameter(afterSalesRequestId, new PathParameterSpec("afterSalesRequestId", "simple", false))}"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.AfterSalesEventsListResult?> AfterSalesEventsListAsync(string afterSalesRequestId)
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.AfterSalesEventsListResult>(ApiPaths.AppPath($"/after_sales/requests/{SerializePathParameter(afterSalesRequestId, new PathParameterSpec("afterSalesRequestId", "simple", false))}/events"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.AfterSalesReturnShipmentsListResult?> AfterSalesReturnShipmentsListAsync(string afterSalesRequestId)
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.AfterSalesReturnShipmentsListResult>(ApiPaths.AppPath($"/after_sales/requests/{SerializePathParameter(afterSalesRequestId, new PathParameterSpec("afterSalesRequestId", "simple", false))}/return_shipments"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsListResult?> ShopsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsListResult>(ApiPaths.AppPath("/shops"));
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentRetrieveResult?> ShopsCurrentRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentRetrieveResult>(ApiPaths.AppPath("/shops/current"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentApplicationsListResult?> ShopsCurrentApplicationsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentApplicationsListResult>(ApiPaths.AppPath("/shops/current/applications"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentBrandAuthorizationsListResult?> ShopsCurrentBrandAuthorizationsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentBrandAuthorizationsListResult>(ApiPaths.AppPath("/shops/current/brand_authorizations"));
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentBusinessHoursRetrieveResult?> ShopsCurrentBusinessHoursRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentBusinessHoursRetrieveResult>(ApiPaths.AppPath("/shops/current/business_hours"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentCategoryBindingsListResult?> ShopsCurrentCategoryBindingsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentCategoryBindingsListResult>(ApiPaths.AppPath("/shops/current/category_bindings"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentChannelsListResult?> ShopsCurrentChannelsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentChannelsListResult>(ApiPaths.AppPath("/shops/current/channels"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentCustomerServicesListResult?> ShopsCurrentCustomerServicesListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentCustomerServicesListResult>(ApiPaths.AppPath("/shops/current/customer_services"));
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentDashboardRetrieveResult?> ShopsCurrentDashboardRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentDashboardRetrieveResult>(ApiPaths.AppPath("/shops/current/dashboard"));
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentDepositAccountRetrieveResult?> ShopsCurrentDepositAccountRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentDepositAccountRetrieveResult>(ApiPaths.AppPath("/shops/current/deposit_account"));
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentFulfillmentProfileRetrieveResult?> ShopsCurrentFulfillmentProfileRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentFulfillmentProfileRetrieveResult>(ApiPaths.AppPath("/shops/current/fulfillment_profile"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentInventoryStocksListResult?> ShopsCurrentInventoryStocksListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentInventoryStocksListResult>(ApiPaths.AppPath("/shops/current/inventory/stocks"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentOrdersListResult?> ShopsCurrentOrdersListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentOrdersListResult>(ApiPaths.AppPath("/shops/current/orders"));
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentOrdersRetrieveResult?> ShopsCurrentOrdersRetrieveAsync(string orderId)
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentOrdersRetrieveResult>(ApiPaths.AppPath($"/shops/current/orders/{SerializePathParameter(orderId, new PathParameterSpec("orderId", "simple", false))}"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentPoliciesListResult?> ShopsCurrentPoliciesListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentPoliciesListResult>(ApiPaths.AppPath("/shops/current/policies"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentProductsListResult?> ShopsCurrentProductsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentProductsListResult>(ApiPaths.AppPath("/shops/current/products"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentQualificationsListResult?> ShopsCurrentQualificationsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentQualificationsListResult>(ApiPaths.AppPath("/shops/current/qualifications"));
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentReadinessRetrieveResult?> ShopsCurrentReadinessRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentReadinessRetrieveResult>(ApiPaths.AppPath("/shops/current/readiness"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentReturnAddressesListResult?> ShopsCurrentReturnAddressesListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentReturnAddressesListResult>(ApiPaths.AppPath("/shops/current/return_addresses"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentRiskSignalsListResult?> ShopsCurrentRiskSignalsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentRiskSignalsListResult>(ApiPaths.AppPath("/shops/current/risk_signals"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentServiceAreasListResult?> ShopsCurrentServiceAreasListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentServiceAreasListResult>(ApiPaths.AppPath("/shops/current/service_areas"));
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentSettlementProfileRetrieveResult?> ShopsCurrentSettlementProfileRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentSettlementProfileRetrieveResult>(ApiPaths.AppPath("/shops/current/settlement_profile"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentSettlementsListResult?> ShopsCurrentSettlementsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentSettlementsListResult>(ApiPaths.AppPath("/shops/current/settlements"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentShippingTemplatesListResult?> ShopsCurrentShippingTemplatesListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentShippingTemplatesListResult>(ApiPaths.AppPath("/shops/current/shipping_templates"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentStatusEventsListResult?> ShopsCurrentStatusEventsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentStatusEventsListResult>(ApiPaths.AppPath("/shops/current/status_events"));
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentVerificationsListResult?> ShopsCurrentVerificationsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentVerificationsListResult>(ApiPaths.AppPath("/shops/current/verifications"));
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsRetrieveResult?> ShopsRetrieveAsync(string shopId)
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ShopsRetrieveResult>(ApiPaths.AppPath($"/shops/{SerializePathParameter(shopId, new PathParameterSpec("shopId", "simple", false))}"));
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.AfterSalesRequestsCreateResult?> AfterSalesRequestsCreateAsync()
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.App.Models.AfterSalesRequestsCreateResult>(ApiPaths.AppPath("/system/after_sales/requests"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.AfterSalesRequestsUpdateResult?> AfterSalesRequestsUpdateAsync(string afterSalesRequestId)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.App.Models.AfterSalesRequestsUpdateResult>(ApiPaths.AppPath($"/system/after_sales/requests/{SerializePathParameter(afterSalesRequestId, new PathParameterSpec("afterSalesRequestId", "simple", false))}"), null);
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.AfterSalesReturnShipmentsCreateResult?> AfterSalesReturnShipmentsCreateAsync(string afterSalesRequestId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.App.Models.AfterSalesReturnShipmentsCreateResult>(ApiPaths.AppPath($"/system/after_sales/requests/{SerializePathParameter(afterSalesRequestId, new PathParameterSpec("afterSalesRequestId", "simple", false))}/return_shipments"), null);
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentApplicationsCreateResult?> ShopsCurrentApplicationsCreateAsync()
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentApplicationsCreateResult>(ApiPaths.AppPath("/system/shops/current/applications"), null);
        }

        /// <summary>
        /// Upsert
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentBrandAuthorizationsUpsertResult?> ShopsCurrentBrandAuthorizationsUpsertAsync()
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentBrandAuthorizationsUpsertResult>(ApiPaths.AppPath("/system/shops/current/brand_authorizations"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentBusinessHoursUpdateResult?> ShopsCurrentBusinessHoursUpdateAsync()
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentBusinessHoursUpdateResult>(ApiPaths.AppPath("/system/shops/current/business_hours"), null);
        }

        /// <summary>
        /// Upsert
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentCategoryBindingsUpsertResult?> ShopsCurrentCategoryBindingsUpsertAsync()
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentCategoryBindingsUpsertResult>(ApiPaths.AppPath("/system/shops/current/category_bindings"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentChannelsUpdateResult?> ShopsCurrentChannelsUpdateAsync(string channelId)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentChannelsUpdateResult>(ApiPaths.AppPath($"/system/shops/current/channels/{SerializePathParameter(channelId, new PathParameterSpec("channelId", "simple", false))}"), null);
        }

        /// <summary>
        /// Upsert
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentCustomerServicesUpsertResult?> ShopsCurrentCustomerServicesUpsertAsync()
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentCustomerServicesUpsertResult>(ApiPaths.AppPath("/system/shops/current/customer_services"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentFulfillmentProfileUpdateResult?> ShopsCurrentFulfillmentProfileUpdateAsync()
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentFulfillmentProfileUpdateResult>(ApiPaths.AppPath("/system/shops/current/fulfillment_profile"), null);
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentInventoryStocksAdjustmentsCreateResult?> ShopsCurrentInventoryStocksAdjustmentsCreateAsync(string stockId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentInventoryStocksAdjustmentsCreateResult>(ApiPaths.AppPath($"/system/shops/current/inventory/stocks/{SerializePathParameter(stockId, new PathParameterSpec("stockId", "simple", false))}/adjustments"), null);
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentOrdersFulfillmentsCreateResult?> ShopsCurrentOrdersFulfillmentsCreateAsync(string orderId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentOrdersFulfillmentsCreateResult>(ApiPaths.AppPath($"/system/shops/current/orders/{SerializePathParameter(orderId, new PathParameterSpec("orderId", "simple", false))}/fulfillments"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentPoliciesUpdateResult?> ShopsCurrentPoliciesUpdateAsync(string policyId)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentPoliciesUpdateResult>(ApiPaths.AppPath($"/system/shops/current/policies/{SerializePathParameter(policyId, new PathParameterSpec("policyId", "simple", false))}"), null);
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentProductsCreateResult?> ShopsCurrentProductsCreateAsync()
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentProductsCreateResult>(ApiPaths.AppPath("/system/shops/current/products"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentProductsUpdateResult?> ShopsCurrentProductsUpdateAsync(string productId)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentProductsUpdateResult>(ApiPaths.AppPath($"/system/shops/current/products/{SerializePathParameter(productId, new PathParameterSpec("productId", "simple", false))}"), null);
        }

        /// <summary>
        /// Publish
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentProductsPublishResult?> ShopsCurrentProductsPublishAsync(string productId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentProductsPublishResult>(ApiPaths.AppPath($"/system/shops/current/products/{SerializePathParameter(productId, new PathParameterSpec("productId", "simple", false))}/publish"), null);
        }

        /// <summary>
        /// Unpublish
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentProductsUnpublishResult?> ShopsCurrentProductsUnpublishAsync(string productId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentProductsUnpublishResult>(ApiPaths.AppPath($"/system/shops/current/products/{SerializePathParameter(productId, new PathParameterSpec("productId", "simple", false))}/unpublish"), null);
        }

        /// <summary>
        /// Upsert
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentQualificationsUpsertResult?> ShopsCurrentQualificationsUpsertAsync()
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentQualificationsUpsertResult>(ApiPaths.AppPath("/system/shops/current/qualifications"), null);
        }

        /// <summary>
        /// Upsert
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentReturnAddressesUpsertResult?> ShopsCurrentReturnAddressesUpsertAsync()
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentReturnAddressesUpsertResult>(ApiPaths.AppPath("/system/shops/current/return_addresses"), null);
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentServiceAreasCreateResult?> ShopsCurrentServiceAreasCreateAsync()
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentServiceAreasCreateResult>(ApiPaths.AppPath("/system/shops/current/service_areas"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentServiceAreasUpdateResult?> ShopsCurrentServiceAreasUpdateAsync(string serviceAreaId)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentServiceAreasUpdateResult>(ApiPaths.AppPath($"/system/shops/current/service_areas/{SerializePathParameter(serviceAreaId, new PathParameterSpec("serviceAreaId", "simple", false))}"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentSettlementProfileUpdateResult?> ShopsCurrentSettlementProfileUpdateAsync()
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentSettlementProfileUpdateResult>(ApiPaths.AppPath("/system/shops/current/settlement_profile"), null);
        }

        /// <summary>
        /// Upsert
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ShopsCurrentShippingTemplatesUpsertResult?> ShopsCurrentShippingTemplatesUpsertAsync()
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.App.Models.ShopsCurrentShippingTemplatesUpsertResult>(ApiPaths.AppPath("/system/shops/current/shipping_templates"), null);
        }

        /// <summary>
        /// Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.SiteRuntimeRetrieveResult?> SiteRuntimeRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.SiteRuntimeRetrieveResult>(ApiPaths.AppPath("/system/site/runtime"));
        }

        private sealed record PathParameterSpec(string Name, string Style, bool Explode);

        private static string SerializePathParameter(object? value, PathParameterSpec spec)
        {
            if (value is null)
            {
                return string.Empty;
            }
            var style = string.IsNullOrWhiteSpace(spec.Style) ? "simple" : spec.Style;
            if (value is System.Collections.IDictionary dictionary)
            {
                return SerializePathObject(spec.Name, dictionary, style, spec.Explode);
            }
            if (value is System.Collections.IEnumerable enumerable && value is not string)
            {
                return SerializePathArray(spec.Name, enumerable, style, spec.Explode);
            }
            return PathPrimitivePrefix(spec.Name, style) + Uri.EscapeDataString(value.ToString() ?? string.Empty);
        }

        private static string SerializePathArray(string name, System.Collections.IEnumerable values, string style, bool explode)
        {
            var serialized = new List<string>();
            foreach (var item in values)
            {
                if (item is not null)
                {
                    serialized.Add(Uri.EscapeDataString(item.ToString() ?? string.Empty));
                }
            }
            if (serialized.Count == 0)
            {
                return PathPrefix(name, style);
            }
            if (style == "matrix")
            {
                if (explode)
                {
                    var parts = new List<string>();
                    foreach (var item in serialized)
                    {
                        parts.Add(";" + name + "=" + item);
                    }
                    return string.Join(string.Empty, parts);
                }
                return ";" + name + "=" + string.Join(",", serialized);
            }
            var separator = explode ? "." : ",";
            return PathPrefix(name, style) + string.Join(separator, serialized);
        }

        private static string SerializePathObject(string name, System.Collections.IDictionary values, string style, bool explode)
        {
            var entries = new List<string>();
            var exploded = new List<string>();
            foreach (System.Collections.DictionaryEntry item in values)
            {
                if (item.Value is null)
                {
                    continue;
                }
                var escapedKey = Uri.EscapeDataString(item.Key.ToString() ?? string.Empty);
                var escapedValue = Uri.EscapeDataString(item.Value.ToString() ?? string.Empty);
                if (explode)
                {
                    exploded.Add(style == "matrix" ? ";" + escapedKey + "=" + escapedValue : escapedKey + "=" + escapedValue);
                }
                else
                {
                    entries.Add(escapedKey);
                    entries.Add(escapedValue);
                }
            }
            if (style == "matrix")
            {
                return explode ? string.Join(string.Empty, exploded) : ";" + name + "=" + string.Join(",", entries);
            }
            if (explode)
            {
                var separator = style == "label" ? "." : ",";
                return PathPrefix(name, style) + string.Join(separator, exploded);
            }
            return PathPrefix(name, style) + string.Join(",", entries);
        }

        private static string PathPrefix(string name, string style)
        {
            return style switch
            {
                "label" => ".",
                "matrix" => ";" + name,
                _ => string.Empty,
            };
        }

        private static string PathPrimitivePrefix(string name, string style)
        {
            return style == "matrix" ? ";" + name + "=" : PathPrefix(name, style);
        }


    }
}
