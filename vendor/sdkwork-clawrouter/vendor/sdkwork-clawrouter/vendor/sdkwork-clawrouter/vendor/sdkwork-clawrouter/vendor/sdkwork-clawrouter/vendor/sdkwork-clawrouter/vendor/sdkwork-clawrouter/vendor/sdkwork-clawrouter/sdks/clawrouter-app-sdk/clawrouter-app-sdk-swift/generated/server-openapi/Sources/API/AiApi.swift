import Foundation

public class AiApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// List groups
    public func channelGroupsList() async throws -> ChannelGroupsListResult? {
        return try await client.get(ApiPaths.appPath("/ai/channel_groups"), responseType: ChannelGroupsListResult.self)
    }

    /// List dashboard overview
    public func dashboardOverviewRetrieve(timeRange: String? = nil, startTime: String? = nil, endTime: String? = nil) async throws -> DashboardOverviewRetrieveResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "time_range", value: timeRange, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "start_time", value: startTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "end_time", value: endTime, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/ai/dashboard/overview"), query), responseType: DashboardOverviewRetrieveResult.self)
    }

    /// List traces
    public func gatewayTracesList() async throws -> GatewayTracesListResult? {
        return try await client.get(ApiPaths.appPath("/ai/gateway/traces"), responseType: GatewayTracesListResult.self)
    }

    /// List model rankings
    public func modelRankingsList(rankScope: String? = nil, vendorCode: String? = nil, modality: String? = nil, q: String? = nil, limit: String? = nil) async throws -> ModelRankingsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "rank_scope", value: rankScope, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "vendor_code", value: vendorCode, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "modality", value: modality, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "limit", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/ai/model_rankings"), query), responseType: ModelRankingsListResult.self)
    }

    /// List ranking vendor filters
    public func modelVendorsList() async throws -> ModelVendorsListResult? {
        return try await client.get(ApiPaths.appPath("/ai/model_vendors"), responseType: ModelVendorsListResult.self)
    }

    /// List model catalog for Playground
    public func modelsList(billingMeter: String? = nil, vendorCode: String? = nil, vendorCodes: [String]? = nil, modalities: [String]? = nil, capabilities: [String]? = nil, categories: [String]? = nil, groups: [String]? = nil, q: String? = nil, limit: String? = nil, offset: String? = nil) async throws -> ModelsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "billing_meter", value: billingMeter, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "vendor_code", value: vendorCode, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "vendor_codes", value: vendorCodes, style: "form", explode: false, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "modalities", value: modalities, style: "form", explode: false, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "capabilities", value: capabilities, style: "form", explode: false, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "categories", value: categories, style: "form", explode: false, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "groups", value: groups, style: "form", explode: false, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "limit", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "offset", value: offset, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/ai/models"), query), responseType: ModelsListResult.self)
    }

    /// List routing API keys
    public func routingApiKeysList() async throws -> RoutingApiKeysListResult? {
        return try await client.get(ApiPaths.appPath("/ai/routing/api_keys"), responseType: RoutingApiKeysListResult.self)
    }

    /// List routing channels
    public func routingChannelsList() async throws -> RoutingChannelsListResult? {
        return try await client.get(ApiPaths.appPath("/ai/routing/channels"), responseType: RoutingChannelsListResult.self)
    }

    /// List routing request traces
    public func routingRequestTracesList() async throws -> RoutingRequestTracesListResult? {
        return try await client.get(ApiPaths.appPath("/ai/routing/request_traces"), responseType: RoutingRequestTracesListResult.self)
    }

    /// List routing usage
    public func routingUsageList() async throws -> RoutingUsageListResult? {
        return try await client.get(ApiPaths.appPath("/ai/routing/usage"), responseType: RoutingUsageListResult.self)
    }

    /// List logs
    public func usageLogsList(page: String? = nil, pageSize: String? = nil, q: String? = nil, status: String? = nil, startTime: String? = nil, endTime: String? = nil) async throws -> UsageLogsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "start_time", value: startTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "end_time", value: endTime, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/ai/usage/logs"), query), responseType: UsageLogsListResult.self)
    }


    private struct QueryParameterSpec {
        let name: String
        let value: Any?
        let style: String
        let explode: Bool
        let allowReserved: Bool
        let contentType: String?
    }

    private func buildQueryString(_ parameters: [QueryParameterSpec]) -> String {
        var pairs: [String] = []
        for parameter in parameters {
            appendSerializedParameter(&pairs, parameter)
        }
        return pairs.joined(separator: "&")
    }

    private func appendSerializedParameter(_ pairs: inout [String], _ parameter: QueryParameterSpec) {
        guard let value = parameter.value else { return }
        if let contentType = parameter.contentType, !contentType.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let data = (try? JSONSerialization.data(withJSONObject: value, options: [])) ?? Data(String(describing: value).utf8)
            let json = String(data: data, encoding: .utf8) ?? String(describing: value)
            pairs.append("\(urlEncode(parameter.name))=\(encodeQueryValue(json, allowReserved: parameter.allowReserved))")
            return
        }

        let style = parameter.style.isEmpty ? "form" : parameter.style
        if style == "deepObject", let object = value as? [String: Any] {
            appendDeepObjectParameter(&pairs, name: parameter.name, values: object, allowReserved: parameter.allowReserved)
        } else if let array = value as? [Any] {
            appendArrayParameter(&pairs, name: parameter.name, values: array, style: style, explode: parameter.explode, allowReserved: parameter.allowReserved)
        } else if let object = value as? [String: Any] {
            appendObjectParameter(&pairs, name: parameter.name, values: object, style: style, explode: parameter.explode, allowReserved: parameter.allowReserved)
        } else {
            pairs.append("\(urlEncode(parameter.name))=\(encodeQueryValue(String(describing: value), allowReserved: parameter.allowReserved))")
        }
    }

    private func appendArrayParameter(
        _ pairs: inout [String],
        name: String,
        values: [Any],
        style: String,
        explode: Bool,
        allowReserved: Bool
    ) {
        let serialized = values.map { String(describing: $0) }
        guard !serialized.isEmpty else { return }
        if style == "form" && explode {
            for item in serialized {
                pairs.append("\(urlEncode(name))=\(encodeQueryValue(item, allowReserved: allowReserved))")
            }
            return
        }
        pairs.append("\(urlEncode(name))=\(encodeQueryValue(serialized.joined(separator: ","), allowReserved: allowReserved))")
    }

    private func appendObjectParameter(
        _ pairs: inout [String],
        name: String,
        values: [String: Any],
        style: String,
        explode: Bool,
        allowReserved: Bool
    ) {
        var serialized: [String] = []
        for (key, value) in values {
            if style == "form" && explode {
                pairs.append("\(urlEncode(key))=\(encodeQueryValue(String(describing: value), allowReserved: allowReserved))")
            } else {
                serialized.append(key)
                serialized.append(String(describing: value))
            }
        }
        if !serialized.isEmpty {
            pairs.append("\(urlEncode(name))=\(encodeQueryValue(serialized.joined(separator: ","), allowReserved: allowReserved))")
        }
    }

    private func appendDeepObjectParameter(_ pairs: inout [String], name: String, values: [String: Any], allowReserved: Bool) {
        for (key, value) in values {
            pairs.append("\(urlEncode("\(name)[\(key)]"))=\(encodeQueryValue(String(describing: value), allowReserved: allowReserved))")
        }
    }

    private func encodeQueryValue(_ value: String, allowReserved: Bool) -> String {
        var encoded = urlEncode(value)
        if !allowReserved { return encoded }
        [
            "%3A": ":", "%2F": "/", "%3F": "?", "%23": "#",
            "%5B": "[", "%5D": "]", "%40": "@", "%21": "!",
            "%24": "$", "%26": "&", "%27": "'", "%28": "(",
            "%29": ")", "%2A": "*", "%2B": "+", "%2C": ",",
            "%3B": ";", "%3D": "=",
        ].forEach { encoded = encoded.replacingOccurrences(of: $0.key, with: $0.value) }
        return encoded
    }

    private func urlEncode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? value
    }

}
