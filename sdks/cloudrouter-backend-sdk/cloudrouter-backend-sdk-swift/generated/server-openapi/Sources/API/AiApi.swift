import Foundation

public class AiApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// List
    public func channelGroupsList() async throws -> ChannelGroupsListResult? {
        return try await client.get(ApiPaths.backendPath("/ai/channel_groups"), responseType: ChannelGroupsListResult.self)
    }

    /// Create
    public func channelGroupsCreate() async throws -> ChannelGroupsCreateResult? {
        return try await client.post(ApiPaths.backendPath("/ai/channel_groups"), body: nil, responseType: ChannelGroupsCreateResult.self)
    }

    /// Delete
    public func channelGroupsDelete(channelGroupId: String) async throws -> ChannelGroupsDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/ai/channel_groups/\(serializePathParameter(channelGroupId, PathParameterSpec(name: "channelGroupId", style: "simple", explode: false)))"), responseType: ChannelGroupsDeleteResult.self)
    }

    /// Update
    public func channelGroupsUpdate(channelGroupId: String) async throws -> ChannelGroupsUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/ai/channel_groups/\(serializePathParameter(channelGroupId, PathParameterSpec(name: "channelGroupId", style: "simple", explode: false)))"), body: nil, responseType: ChannelGroupsUpdateResult.self)
    }

    /// List
    public func channelGroupsBindingsList(channelGroupId: String) async throws -> ChannelGroupsChannelBindingsListResult? {
        return try await client.get(ApiPaths.backendPath("/ai/channel_groups/\(serializePathParameter(channelGroupId, PathParameterSpec(name: "channelGroupId", style: "simple", explode: false)))/channel_bindings"), responseType: ChannelGroupsChannelBindingsListResult.self)
    }

    /// Update
    public func channelGroupsBindingsUpdate(channelGroupId: String) async throws -> ChannelGroupsChannelBindingsUpdateResult? {
        return try await client.put(ApiPaths.backendPath("/ai/channel_groups/\(serializePathParameter(channelGroupId, PathParameterSpec(name: "channelGroupId", style: "simple", explode: false)))/channel_bindings"), body: nil, responseType: ChannelGroupsChannelBindingsUpdateResult.self)
    }

    /// Retrieve
    public func channelGroupsRouteExplainRetrieve(channelGroupId: String) async throws -> ChannelGroupsRouteExplainRetrieveResult? {
        return try await client.get(ApiPaths.backendPath("/ai/channel_groups/\(serializePathParameter(channelGroupId, PathParameterSpec(name: "channelGroupId", style: "simple", explode: false)))/route_explain"), responseType: ChannelGroupsRouteExplainRetrieveResult.self)
    }

    /// List
    public func modelMappingOptionsList() async throws -> ModelMappingOptionsListResult? {
        return try await client.get(ApiPaths.backendPath("/ai/model_mapping_options"), responseType: ModelMappingOptionsListResult.self)
    }

    /// List
    public func modelMappingsList() async throws -> ModelMappingsListResult? {
        return try await client.get(ApiPaths.backendPath("/ai/model_mappings"), responseType: ModelMappingsListResult.self)
    }

    /// Create
    public func modelMappingsCreate() async throws -> ModelMappingsCreateResult? {
        return try await client.post(ApiPaths.backendPath("/ai/model_mappings"), body: nil, responseType: ModelMappingsCreateResult.self)
    }

    /// Replace
    public func modelMappingsReplace() async throws -> ModelMappingsReplaceResult? {
        return try await client.put(ApiPaths.backendPath("/ai/model_mappings"), body: nil, responseType: ModelMappingsReplaceResult.self)
    }

    /// Create
    public func modelMappingsResolveCreate() async throws -> ModelMappingsResolveCreateResult? {
        return try await client.post(ApiPaths.backendPath("/ai/model_mappings/resolve"), body: nil, responseType: ModelMappingsResolveCreateResult.self)
    }

    /// Delete
    public func modelMappingsDelete(mappingId: String) async throws -> ModelMappingsDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/ai/model_mappings/\(serializePathParameter(mappingId, PathParameterSpec(name: "mappingId", style: "simple", explode: false)))"), responseType: ModelMappingsDeleteResult.self)
    }

    /// Update
    public func modelMappingsUpdate(mappingId: String) async throws -> ModelMappingsUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/ai/model_mappings/\(serializePathParameter(mappingId, PathParameterSpec(name: "mappingId", style: "simple", explode: false)))"), body: nil, responseType: ModelMappingsUpdateResult.self)
    }

    /// List
    public func modelRankingsList(rankScope: String? = nil, vendorCode: String? = nil, modality: String? = nil, q: String? = nil, pageSize: Int? = nil) async throws -> ModelRankingsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "rank_scope", value: rankScope, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "vendor_code", value: vendorCode, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "modality", value: modality, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/model_rankings"), query), responseType: ModelRankingsListResult.self)
    }

    /// List
    public func modelRankingsJobsList(rankScope: String? = nil, pageSize: Int? = nil) async throws -> ModelRankingsJobsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "rank_scope", value: rankScope, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/model_rankings/jobs"), query), responseType: ModelRankingsJobsListResult.self)
    }

    /// Refresh
    public func modelRankingsRefresh() async throws -> ModelRankingsRefreshResult? {
        return try await client.post(ApiPaths.backendPath("/ai/model_rankings/refresh"), body: nil, responseType: ModelRankingsRefreshResult.self)
    }

    /// Retrieve
    public func modelRankingsStatusRetrieve(page: Int? = nil, pageSize: Int? = nil, q: String? = nil, billingMeter: String? = nil, vendorCodes: [String]? = nil, modalities: [String]? = nil, capabilities: [String]? = nil, categories: [String]? = nil, groups: [String]? = nil) async throws -> ModelRankingsStatusRetrieveResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "billing_meter", value: billingMeter, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "vendor_codes", value: vendorCodes, style: "form", explode: false, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "modalities", value: modalities, style: "form", explode: false, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "capabilities", value: capabilities, style: "form", explode: false, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "categories", value: categories, style: "form", explode: false, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "groups", value: groups, style: "form", explode: false, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/model_rankings/status"), query), responseType: ModelRankingsStatusRetrieveResult.self)
    }

    /// List
    public func modelVendorsList() async throws -> ModelVendorsListResult? {
        return try await client.get(ApiPaths.backendPath("/ai/model_vendors"), responseType: ModelVendorsListResult.self)
    }

    /// Create
    public func modelVendorsCreate() async throws -> ModelVendorsCreateResult? {
        return try await client.post(ApiPaths.backendPath("/ai/model_vendors"), body: nil, responseType: ModelVendorsCreateResult.self)
    }

    /// List
    public func modelsList(page: Int? = nil, pageSize: Int? = nil, q: String? = nil, billingMeter: String? = nil, vendorCodes: [String]? = nil, modalities: [String]? = nil, capabilities: [String]? = nil, categories: [String]? = nil, groups: [String]? = nil) async throws -> ModelsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "billing_meter", value: billingMeter, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "vendor_codes", value: vendorCodes, style: "form", explode: false, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "modalities", value: modalities, style: "form", explode: false, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "capabilities", value: capabilities, style: "form", explode: false, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "categories", value: categories, style: "form", explode: false, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "groups", value: groups, style: "form", explode: false, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/models"), query), responseType: ModelsListResult.self)
    }

    /// Create
    public func modelsCreate() async throws -> ModelsCreateResult? {
        return try await client.post(ApiPaths.backendPath("/ai/models"), body: nil, responseType: ModelsCreateResult.self)
    }

    /// Refresh
    public func modelsRefresh() async throws -> ModelsRefreshResult? {
        return try await client.post(ApiPaths.backendPath("/ai/models/refresh"), body: nil, responseType: ModelsRefreshResult.self)
    }

    /// Delete
    public func modelsDelete(modelId: String) async throws -> ModelsDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/ai/models/\(serializePathParameter(modelId, PathParameterSpec(name: "modelId", style: "simple", explode: false)))"), responseType: ModelsDeleteResult.self)
    }

    /// Update
    public func modelsUpdate(modelId: String) async throws -> ModelsUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/ai/models/\(serializePathParameter(modelId, PathParameterSpec(name: "modelId", style: "simple", explode: false)))"), body: nil, responseType: ModelsUpdateResult.self)
    }

    /// List
    public func getResourceGroupsList() async throws -> AiResourceGroupsListResult? {
        return try await client.get(ApiPaths.backendPath("/ai/resource_groups"), responseType: AiResourceGroupsListResult.self)
    }

    /// Create
    public func resourceGroupsCreate() async throws -> AiResourceGroupsCreateResult? {
        return try await client.post(ApiPaths.backendPath("/ai/resource_groups"), body: nil, responseType: AiResourceGroupsCreateResult.self)
    }

    /// List
    public func getResourceGroupsListResourceGroups(groupIdOrCode: String) async throws -> AiResourceGroupsResourcesListResult? {
        return try await client.get(ApiPaths.backendPath("/ai/resource_groups/\(serializePathParameter(groupIdOrCode, PathParameterSpec(name: "groupIdOrCode", style: "simple", explode: false)))/resources"), responseType: AiResourceGroupsResourcesListResult.self)
    }

    /// Delete
    public func resourceGroupsDelete(groupId: String) async throws -> AiResourceGroupsDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/ai/resource_groups/\(serializePathParameter(groupId, PathParameterSpec(name: "groupId", style: "simple", explode: false)))"), responseType: AiResourceGroupsDeleteResult.self)
    }

    /// Update
    public func resourceGroupsUpdate(groupId: String) async throws -> AiResourceGroupsUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/ai/resource_groups/\(serializePathParameter(groupId, PathParameterSpec(name: "groupId", style: "simple", explode: false)))"), body: nil, responseType: AiResourceGroupsUpdateResult.self)
    }

    /// List
    public func resourcesList() async throws -> AiResourcesListResult? {
        return try await client.get(ApiPaths.backendPath("/ai/resources"), responseType: AiResourcesListResult.self)
    }

    /// Create
    public func resourcesCreate() async throws -> AiResourcesCreateResult? {
        return try await client.post(ApiPaths.backendPath("/ai/resources"), body: nil, responseType: AiResourcesCreateResult.self)
    }

    /// Update
    public func resourcesUpdate(resourceId: String) async throws -> AiResourcesUpdateResult? {
        return try await client.put(ApiPaths.backendPath("/ai/resources/\(serializePathParameter(resourceId, PathParameterSpec(name: "resourceId", style: "simple", explode: false)))"), body: nil, responseType: AiResourcesUpdateResult.self)
    }

    /// Create
    public func routeExplainCreate() async throws -> RouteExplainCreateResult? {
        return try await client.post(ApiPaths.backendPath("/ai/route_explain"), body: nil, responseType: RouteExplainCreateResult.self)
    }

    private struct PathParameterSpec {
        let name: String
        let style: String
        let explode: Bool
    }

    private func serializePathParameter(_ value: Any?, _ spec: PathParameterSpec) -> String {
        guard let value else { return "" }
        let style = spec.style.isEmpty ? "simple" : spec.style
        if let array = value as? [Any] {
            return serializePathArray(spec.name, array, style, spec.explode)
        }
        if let object = value as? [String: Any] {
            return serializePathObject(spec.name, object, style, spec.explode)
        }
        return pathPrimitivePrefix(spec.name, style) + pathEncode(String(describing: value))
    }

    private func serializePathArray(_ name: String, _ values: [Any], _ style: String, _ explode: Bool) -> String {
        let serialized = values.map { pathEncode(String(describing: $0)) }
        if serialized.isEmpty { return pathPrefix(name, style) }
        if style == "matrix" {
            if explode {
                return serialized.map { ";\(name)=\($0)" }.joined()
            }
            return ";\(name)=" + serialized.joined(separator: ",")
        }
        let separator = explode ? "." : ","
        return pathPrefix(name, style) + serialized.joined(separator: separator)
    }

    private func serializePathObject(_ name: String, _ values: [String: Any], _ style: String, _ explode: Bool) -> String {
        var entries: [String] = []
        var exploded: [String] = []
        for (key, value) in values {
            let escapedKey = pathEncode(key)
            let escapedValue = pathEncode(String(describing: value))
            if explode {
                if style == "matrix" {
                    exploded.append(";\(escapedKey)=\(escapedValue)")
                } else {
                    exploded.append("\(escapedKey)=\(escapedValue)")
                }
            } else {
                entries.append(escapedKey)
                entries.append(escapedValue)
            }
        }
        if style == "matrix" {
            if explode {
                return exploded.joined()
            }
            return ";\(name)=" + entries.joined(separator: ",")
        }
        if explode {
            let separator = style == "label" ? "." : ","
            return pathPrefix(name, style) + exploded.joined(separator: separator)
        }
        return pathPrefix(name, style) + entries.joined(separator: ",")
    }

    private func pathPrefix(_ name: String, _ style: String) -> String {
        if style == "label" { return "." }
        if style == "matrix" { return ";\(name)" }
        return ""
    }

    private func pathPrimitivePrefix(_ name: String, _ style: String) -> String {
        style == "matrix" ? ";\(name)=" : pathPrefix(name, style)
    }

    private func pathEncode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? value
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
