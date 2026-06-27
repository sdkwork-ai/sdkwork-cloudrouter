using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Backend.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Backend.Http.HttpClient;

namespace Sdkwork.ClawRouter.Backend.Api
{
    public class ServiceProvidersApi
    {
        private readonly SdkHttpClient _client;

        public ServiceProvidersApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Service Provider Adjustments List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AdjustmentsListResult?> AdjustmentsListAsync(string? page = null, string? pageSize = null, string? status = null, string? providerId = null, string? sellerProviderId = null, string? buyerProviderId = null, string? edgeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("provider_id", providerId, "form", true, false, null),
                new QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
                new QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
                new QueryParameterSpec("edge_id", edgeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.AdjustmentsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/service_providers/adjustments"), queryString));
        }

        /// <summary>
        /// Service Provider Audit Events List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AuditEventsListResult?> AuditEventsListAsync(string? page = null, string? pageSize = null, string? status = null, string? providerId = null, string? sellerProviderId = null, string? buyerProviderId = null, string? edgeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("provider_id", providerId, "form", true, false, null),
                new QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
                new QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
                new QueryParameterSpec("edge_id", edgeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.AuditEventsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/service_providers/audit/events"), queryString));
        }

        /// <summary>
        /// Service Provider Bindings List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.BindingsListResult?> BindingsListAsync(string? page = null, string? pageSize = null, string? status = null, string? providerId = null, string? sellerProviderId = null, string? buyerProviderId = null, string? edgeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("provider_id", providerId, "form", true, false, null),
                new QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
                new QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
                new QueryParameterSpec("edge_id", edgeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.BindingsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/service_providers/bindings"), queryString));
        }

        /// <summary>
        /// Service Provider Contracts List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ContractsListResult?> ContractsListAsync(string? page = null, string? pageSize = null, string? status = null, string? providerId = null, string? sellerProviderId = null, string? buyerProviderId = null, string? edgeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("provider_id", providerId, "form", true, false, null),
                new QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
                new QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
                new QueryParameterSpec("edge_id", edgeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ContractsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/service_providers/contracts"), queryString));
        }

        /// <summary>
        /// Service Provider Dashboard Retrieve
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.DashboardRetrieveResult?> DashboardRetrieveAsync(string? page = null, string? pageSize = null, string? status = null, string? providerId = null, string? sellerProviderId = null, string? buyerProviderId = null, string? edgeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("provider_id", providerId, "form", true, false, null),
                new QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
                new QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
                new QueryParameterSpec("edge_id", edgeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.DashboardRetrieveResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/service_providers/dashboard"), queryString));
        }

        /// <summary>
        /// Service Provider Downstreams List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.DownstreamsListResult?> DownstreamsListAsync(string? page = null, string? pageSize = null, string? status = null, string? providerId = null, string? sellerProviderId = null, string? buyerProviderId = null, string? edgeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("provider_id", providerId, "form", true, false, null),
                new QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
                new QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
                new QueryParameterSpec("edge_id", edgeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.DownstreamsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/service_providers/downstreams"), queryString));
        }

        /// <summary>
        /// Service Provider Downstream Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.DownstreamsCreateResult?> DownstreamsCreateAsync(Sdkwork.ClawRouter.Backend.Models.ServiceProviderDownstreamCreateRequest body, string idempotencyKey)
        {
            var requestHeaders = BuildRequestHeaders(
                new Dictionary<string, HeaderParameterSpec>
                {
                    ["Idempotency-Key"] = new HeaderParameterSpec(idempotencyKey, "simple", false, null),
                },
                new Dictionary<string, HeaderParameterSpec>()
            );
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.DownstreamsCreateResult>(ApiPaths.BackendPath("/service_providers/downstreams"), body, null, requestHeaders, "application/json");
        }

        /// <summary>
        /// Service Provider Members List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.MembersListResult?> MembersListAsync(string? page = null, string? pageSize = null, string? status = null, string? providerId = null, string? sellerProviderId = null, string? buyerProviderId = null, string? edgeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("provider_id", providerId, "form", true, false, null),
                new QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
                new QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
                new QueryParameterSpec("edge_id", edgeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.MembersListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/service_providers/members"), queryString));
        }

        /// <summary>
        /// Service Provider Pricing Rules List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.PricingRulesListResult?> PricingRulesListAsync(string? page = null, string? pageSize = null, string? status = null, string? providerId = null, string? sellerProviderId = null, string? buyerProviderId = null, string? edgeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("provider_id", providerId, "form", true, false, null),
                new QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
                new QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
                new QueryParameterSpec("edge_id", edgeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.PricingRulesListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/service_providers/pricing/rules"), queryString));
        }

        /// <summary>
        /// Service Provider Pricing Rule Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.PricingRulesCreateResult?> PricingRulesCreateAsync(Sdkwork.ClawRouter.Backend.Models.ServiceProviderPricingRuleCreateRequest body, string idempotencyKey)
        {
            var requestHeaders = BuildRequestHeaders(
                new Dictionary<string, HeaderParameterSpec>
                {
                    ["Idempotency-Key"] = new HeaderParameterSpec(idempotencyKey, "simple", false, null),
                },
                new Dictionary<string, HeaderParameterSpec>()
            );
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.PricingRulesCreateResult>(ApiPaths.BackendPath("/service_providers/pricing/rules"), body, null, requestHeaders, "application/json");
        }

        /// <summary>
        /// Service Provider Pricing Rule Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.PricingRulesUpdateResult?> PricingRulesUpdateAsync(string ruleId, Sdkwork.ClawRouter.Backend.Models.ServiceProviderPricingRuleUpdateRequest body, string idempotencyKey)
        {
            var requestHeaders = BuildRequestHeaders(
                new Dictionary<string, HeaderParameterSpec>
                {
                    ["Idempotency-Key"] = new HeaderParameterSpec(idempotencyKey, "simple", false, null),
                },
                new Dictionary<string, HeaderParameterSpec>()
            );
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.PricingRulesUpdateResult>(ApiPaths.BackendPath($"/service_providers/pricing/rules/{SerializePathParameter(ruleId, new PathParameterSpec("ruleId", "simple", false))}"), body, null, requestHeaders, "application/json");
        }

        /// <summary>
        /// Service Provider Price Simulation Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.PriceSimulationCreateResult?> PriceSimulationCreateAsync(Sdkwork.ClawRouter.Backend.Models.ServiceProviderPriceSimulationRequest body, string idempotencyKey)
        {
            var requestHeaders = BuildRequestHeaders(
                new Dictionary<string, HeaderParameterSpec>
                {
                    ["Idempotency-Key"] = new HeaderParameterSpec(idempotencyKey, "simple", false, null),
                },
                new Dictionary<string, HeaderParameterSpec>()
            );
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.PriceSimulationCreateResult>(ApiPaths.BackendPath("/service_providers/pricing/simulations"), body, null, requestHeaders, "application/json");
        }

        /// <summary>
        /// Service Providers List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ProviderRegistryListResult?> ProviderRegistryListAsync(string? page = null, string? pageSize = null, string? status = null, string? providerId = null, string? sellerProviderId = null, string? buyerProviderId = null, string? edgeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("provider_id", providerId, "form", true, false, null),
                new QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
                new QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
                new QueryParameterSpec("edge_id", edgeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ProviderRegistryListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/service_providers/providers"), queryString));
        }

        /// <summary>
        /// Service Provider Reconciliation Runs List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ReconciliationRunsListResult?> ReconciliationRunsListAsync(string? page = null, string? pageSize = null, string? status = null, string? providerId = null, string? sellerProviderId = null, string? buyerProviderId = null, string? edgeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("provider_id", providerId, "form", true, false, null),
                new QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
                new QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
                new QueryParameterSpec("edge_id", edgeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ReconciliationRunsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/service_providers/reconciliation_runs"), queryString));
        }

        /// <summary>
        /// Service Provider Relations List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RelationsListResult?> RelationsListAsync(string? page = null, string? pageSize = null, string? status = null, string? providerId = null, string? sellerProviderId = null, string? buyerProviderId = null, string? edgeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("provider_id", providerId, "form", true, false, null),
                new QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
                new QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
                new QueryParameterSpec("edge_id", edgeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.RelationsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/service_providers/relations"), queryString));
        }

        /// <summary>
        /// Service Provider Risk Events List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RiskEventsListResult?> RiskEventsListAsync(string? page = null, string? pageSize = null, string? status = null, string? providerId = null, string? sellerProviderId = null, string? buyerProviderId = null, string? edgeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("provider_id", providerId, "form", true, false, null),
                new QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
                new QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
                new QueryParameterSpec("edge_id", edgeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.RiskEventsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/service_providers/risk/events"), queryString));
        }

        /// <summary>
        /// Service Provider Statements List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.StatementsListResult?> StatementsListAsync(string? page = null, string? pageSize = null, string? status = null, string? providerId = null, string? sellerProviderId = null, string? buyerProviderId = null, string? edgeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("provider_id", providerId, "form", true, false, null),
                new QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
                new QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
                new QueryParameterSpec("edge_id", edgeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.StatementsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/service_providers/statements"), queryString));
        }

        /// <summary>
        /// Service Provider Usage List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.UsageListResult?> UsageListAsync(string? page = null, string? pageSize = null, string? status = null, string? providerId = null, string? sellerProviderId = null, string? buyerProviderId = null, string? edgeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("provider_id", providerId, "form", true, false, null),
                new QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
                new QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
                new QueryParameterSpec("edge_id", edgeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.UsageListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/service_providers/usage"), queryString));
        }

        /// <summary>
        /// Service Provider Wallet Accounts List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ProviderWalletAccountsListResult?> ProviderWalletAccountsListAsync(string? page = null, string? pageSize = null, string? status = null, string? providerId = null, string? sellerProviderId = null, string? buyerProviderId = null, string? edgeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("provider_id", providerId, "form", true, false, null),
                new QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
                new QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
                new QueryParameterSpec("edge_id", edgeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ProviderWalletAccountsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/service_providers/wallet/accounts"), queryString));
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

        private sealed record QueryParameterSpec(
            string Name,
            object? Value,
            string Style,
            bool Explode,
            bool AllowReserved,
            string? ContentType);

        private static string BuildQueryString(IEnumerable<QueryParameterSpec> parameters)
        {
            var pairs = new List<string>();
            foreach (var parameter in parameters)
            {
                AppendSerializedParameter(pairs, parameter);
            }
            return string.Join("&", pairs);
        }

        private static void AppendSerializedParameter(List<string> pairs, QueryParameterSpec parameter)
        {
            if (parameter.Value is null)
            {
                return;
            }

            if (!string.IsNullOrWhiteSpace(parameter.ContentType))
            {
                var json = System.Text.Json.JsonSerializer.Serialize(parameter.Value);
                pairs.Add(Uri.EscapeDataString(parameter.Name) + "=" + EncodeQueryValue(json, parameter.AllowReserved));
                return;
            }

            var style = string.IsNullOrWhiteSpace(parameter.Style) ? "form" : parameter.Style;
            if (style == "deepObject" && parameter.Value is System.Collections.IDictionary deepObject)
            {
                AppendDeepObjectParameter(pairs, parameter.Name, deepObject, parameter.AllowReserved);
            }
            else if (parameter.Value is System.Collections.IEnumerable enumerable && parameter.Value is not string && parameter.Value is not System.Collections.IDictionary)
            {
                AppendArrayParameter(pairs, parameter.Name, enumerable, style, parameter.Explode, parameter.AllowReserved);
            }
            else if (parameter.Value is System.Collections.IDictionary dictionary)
            {
                AppendObjectParameter(pairs, parameter.Name, dictionary, style, parameter.Explode, parameter.AllowReserved);
            }
            else
            {
                pairs.Add(Uri.EscapeDataString(parameter.Name) + "=" + EncodeQueryValue(parameter.Value.ToString() ?? string.Empty, parameter.AllowReserved));
            }
        }

        private static void AppendArrayParameter(List<string> pairs, string name, System.Collections.IEnumerable values, string style, bool explode, bool allowReserved)
        {
            var serialized = new List<string>();
            foreach (var item in values)
            {
                if (item is not null)
                {
                    serialized.Add(item.ToString() ?? string.Empty);
                }
            }
            if (serialized.Count == 0)
            {
                return;
            }
            if (style == "form" && explode)
            {
                foreach (var item in serialized)
                {
                    pairs.Add(Uri.EscapeDataString(name) + "=" + EncodeQueryValue(item, allowReserved));
                }
                return;
            }
            pairs.Add(Uri.EscapeDataString(name) + "=" + EncodeQueryValue(string.Join(",", serialized), allowReserved));
        }

        private static void AppendObjectParameter(List<string> pairs, string name, System.Collections.IDictionary values, string style, bool explode, bool allowReserved)
        {
            var serialized = new List<string>();
            foreach (System.Collections.DictionaryEntry item in values)
            {
                if (item.Value is null)
                {
                    continue;
                }
                if (style == "form" && explode)
                {
                    pairs.Add(Uri.EscapeDataString(item.Key.ToString() ?? string.Empty) + "=" + EncodeQueryValue(item.Value.ToString() ?? string.Empty, allowReserved));
                }
                else
                {
                    serialized.Add(item.Key.ToString() ?? string.Empty);
                    serialized.Add(item.Value.ToString() ?? string.Empty);
                }
            }
            if (serialized.Count > 0)
            {
                pairs.Add(Uri.EscapeDataString(name) + "=" + EncodeQueryValue(string.Join(",", serialized), allowReserved));
            }
        }

        private static void AppendDeepObjectParameter(List<string> pairs, string name, System.Collections.IDictionary values, bool allowReserved)
        {
            foreach (System.Collections.DictionaryEntry item in values)
            {
                if (item.Value is not null)
                {
                    pairs.Add(Uri.EscapeDataString(name + "[" + item.Key + "]") + "=" + EncodeQueryValue(item.Value.ToString() ?? string.Empty, allowReserved));
                }
            }
        }

        private static string EncodeQueryValue(string value, bool allowReserved)
        {
            var encoded = Uri.EscapeDataString(value);
            if (!allowReserved)
            {
                return encoded;
            }
            return encoded
                .Replace("%3A", ":").Replace("%2F", "/").Replace("%3F", "?").Replace("%23", "#")
                .Replace("%5B", "[").Replace("%5D", "]").Replace("%40", "@").Replace("%21", "!")
                .Replace("%24", "$").Replace("%26", "&").Replace("%27", "'").Replace("%28", "(")
                .Replace("%29", ")").Replace("%2A", "*").Replace("%2B", "+").Replace("%2C", ",")
                .Replace("%3B", ";").Replace("%3D", "=");
        }

        private sealed record HeaderParameterSpec(object? Value, string Style, bool Explode, string? ContentType);

        private static Dictionary<string, string>? BuildRequestHeaders(
            Dictionary<string, HeaderParameterSpec> headers,
            Dictionary<string, HeaderParameterSpec> cookies)
        {
            var requestHeaders = new Dictionary<string, string>();
            foreach (var item in headers)
            {
                var serialized = SerializeParameterValue(item.Value);
                if (serialized is not null)
                {
                    requestHeaders[item.Key] = serialized;
                }
            }

            var cookieHeader = BuildCookieHeader(cookies);
            if (!string.IsNullOrEmpty(cookieHeader))
            {
                requestHeaders["Cookie"] = requestHeaders.TryGetValue("Cookie", out var existing) && !string.IsNullOrEmpty(existing)
                    ? existing + "; " + cookieHeader
                    : cookieHeader;
            }

            return requestHeaders.Count == 0 ? null : requestHeaders;
        }

        private static string BuildCookieHeader(Dictionary<string, HeaderParameterSpec> cookies)
        {
            var pairs = new List<string>();
            foreach (var item in cookies)
            {
                var serialized = SerializeParameterValue(item.Value);
                if (serialized is not null)
                {
                    pairs.Add(Uri.EscapeDataString(item.Key) + "=" + Uri.EscapeDataString(serialized));
                }
            }
            return string.Join("; ", pairs);
        }

        private static string? SerializeParameterValue(HeaderParameterSpec? parameter)
        {
            var value = parameter?.Value;
            if (value is null)
            {
                return null;
            }
            if (!string.IsNullOrWhiteSpace(parameter!.ContentType))
            {
                return System.Text.Json.JsonSerializer.Serialize(value);
            }
            if (value is System.Collections.IEnumerable enumerable && value is not string)
            {
                var values = new List<string>();
                foreach (var item in enumerable)
                {
                    if (item is not null)
                    {
                        values.Add(item.ToString() ?? string.Empty);
                    }
                }
                return string.Join(",", values);
            }
            if (value is System.Collections.IDictionary dictionary)
            {
                var values = new List<string>();
                foreach (System.Collections.DictionaryEntry item in dictionary)
                {
                    if (item.Value is null)
                    {
                        continue;
                    }
                    if (parameter.Explode)
                    {
                        values.Add((item.Key.ToString() ?? string.Empty) + "=" + (item.Value.ToString() ?? string.Empty));
                    }
                    else
                    {
                        values.Add(item.Key.ToString() ?? string.Empty);
                        values.Add(item.Value.ToString() ?? string.Empty);
                    }
                }
                return string.Join(",", values);
            }
            return value.ToString();
        }
    }
}
