import Foundation

public class McpApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Update MCP binding
    public func serversBindingsUpdate(bindingId: String, body: AdminMcpBindingUpdateRequest) async throws -> ServersBindingsUpdateResult? {
        return try await client.put(ApiPaths.backendPath("/mcp/bindings/\(serializePathParameter(bindingId, PathParameterSpec(name: "bindingId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: ServersBindingsUpdateResult.self)
    }

    /// Publish MCP server revision
    public func revisionsPublish(revisionId: String) async throws -> RevisionsPublishResult? {
        return try await client.post(ApiPaths.backendPath("/mcp/revisions/\(serializePathParameter(revisionId, PathParameterSpec(name: "revisionId", style: "simple", explode: false)))/publish"), body: nil, responseType: RevisionsPublishResult.self)
    }

    /// List MCP servers
    public func serversList(page: String? = nil, pageSize: String? = nil, q: String? = nil, transport: String? = nil, visibility: String? = nil, status: String? = nil, categoryId: String? = nil) async throws -> ServersListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "transport", value: transport, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "visibility", value: visibility, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "category_id", value: categoryId, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/mcp/servers"), query), responseType: ServersListResult.self)
    }

    /// Create MCP server
    public func serversCreate(body: AdminMcpServerCreateRequest, idempotencyKey: String) async throws -> ServersCreateResult? {
        let requestHeaders = buildRequestHeaders(
            [
                "Idempotency-Key": HeaderParameterSpec(value: idempotencyKey, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post(ApiPaths.backendPath("/mcp/servers"), body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: ServersCreateResult.self)
    }

    /// Retrieve MCP server
    public func serversRetrieve(serverId: String) async throws -> ServersRetrieveResult? {
        return try await client.get(ApiPaths.backendPath("/mcp/servers/\(serializePathParameter(serverId, PathParameterSpec(name: "serverId", style: "simple", explode: false)))"), responseType: ServersRetrieveResult.self)
    }

    /// Update MCP server
    public func serversUpdate(serverId: String, body: AdminMcpServerUpdateRequest) async throws -> ServersUpdateResult? {
        return try await client.put(ApiPaths.backendPath("/mcp/servers/\(serializePathParameter(serverId, PathParameterSpec(name: "serverId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: ServersUpdateResult.self)
    }

    /// List MCP bindings
    public func serversBindingsList(serverId: String) async throws -> ServersBindingsListResult? {
        return try await client.get(ApiPaths.backendPath("/mcp/servers/\(serializePathParameter(serverId, PathParameterSpec(name: "serverId", style: "simple", explode: false)))/bindings"), responseType: ServersBindingsListResult.self)
    }

    /// Create MCP binding
    public func serversBindingsCreate(serverId: String, body: AdminMcpBindingCreateRequest, idempotencyKey: String) async throws -> ServersBindingsCreateResult? {
        let requestHeaders = buildRequestHeaders(
            [
                "Idempotency-Key": HeaderParameterSpec(value: idempotencyKey, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post(ApiPaths.backendPath("/mcp/servers/\(serializePathParameter(serverId, PathParameterSpec(name: "serverId", style: "simple", explode: false)))/bindings"), body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: ServersBindingsCreateResult.self)
    }

    /// Discover MCP tools
    public func serversToolsRefresh(serverId: String) async throws -> ServersToolsRefreshResult? {
        return try await client.post(ApiPaths.backendPath("/mcp/servers/\(serializePathParameter(serverId, PathParameterSpec(name: "serverId", style: "simple", explode: false)))/discover"), body: nil, responseType: ServersToolsRefreshResult.self)
    }

    /// Check MCP server health
    public func serversHealthChecksCreate(serverId: String) async throws -> ServersHealthChecksCreateResult? {
        return try await client.post(ApiPaths.backendPath("/mcp/servers/\(serializePathParameter(serverId, PathParameterSpec(name: "serverId", style: "simple", explode: false)))/health_check"), body: nil, responseType: ServersHealthChecksCreateResult.self)
    }

    /// List MCP server revisions
    public func serversRevisionsList(serverId: String) async throws -> ServersRevisionsListResult? {
        return try await client.get(ApiPaths.backendPath("/mcp/servers/\(serializePathParameter(serverId, PathParameterSpec(name: "serverId", style: "simple", explode: false)))/revisions"), responseType: ServersRevisionsListResult.self)
    }

    /// Create MCP server revision
    public func serversRevisionsCreate(serverId: String, body: AdminMcpServerRevisionCreateRequest, idempotencyKey: String) async throws -> ServersRevisionsCreateResult? {
        let requestHeaders = buildRequestHeaders(
            [
                "Idempotency-Key": HeaderParameterSpec(value: idempotencyKey, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post(ApiPaths.backendPath("/mcp/servers/\(serializePathParameter(serverId, PathParameterSpec(name: "serverId", style: "simple", explode: false)))/revisions"), body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: ServersRevisionsCreateResult.self)
    }

    /// List MCP tools
    public func serversToolsList(serverId: String) async throws -> ServersToolsListResult? {
        return try await client.get(ApiPaths.backendPath("/mcp/servers/\(serializePathParameter(serverId, PathParameterSpec(name: "serverId", style: "simple", explode: false)))/tools"), responseType: ServersToolsListResult.self)
    }

    /// Update MCP tool
    public func toolsUpdate(toolId: String, body: AdminMcpToolUpdateRequest) async throws -> ToolsUpdateResult? {
        return try await client.put(ApiPaths.backendPath("/mcp/tools/\(serializePathParameter(toolId, PathParameterSpec(name: "toolId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: ToolsUpdateResult.self)
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

    private struct HeaderParameterSpec {
        let value: Any?
        let style: String
        let explode: Bool
        let contentType: String?
    }

    private func buildRequestHeaders(_ headers: [String: HeaderParameterSpec], _ cookies: [String: HeaderParameterSpec]) -> [String: String]? {
        var requestHeaders: [String: String] = [:]
        for (name, parameter) in headers {
            if let serialized = serializeParameterValue(parameter) {
                requestHeaders[name] = serialized
            }
        }

        if let cookieHeader = buildCookieHeader(cookies), !cookieHeader.isEmpty {
            requestHeaders["Cookie"] = requestHeaders["Cookie"].map { "\($0); \(cookieHeader)" } ?? cookieHeader
        }

        return requestHeaders.isEmpty ? nil : requestHeaders
    }

    private func buildCookieHeader(_ cookies: [String: HeaderParameterSpec]) -> String? {
        let pairs = cookies.compactMap { name, parameter -> String? in
            guard let serialized = serializeParameterValue(parameter) else { return nil }
            return "\(urlEncode(name))=\(urlEncode(serialized))"
        }
        return pairs.isEmpty ? nil : pairs.joined(separator: "; ")
    }

    private func serializeParameterValue(_ parameter: HeaderParameterSpec?) -> String? {
        guard let parameter, let value = parameter.value else { return nil }
        if let contentType = parameter.contentType, !contentType.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            if JSONSerialization.isValidJSONObject(value),
               let data = try? JSONSerialization.data(withJSONObject: value, options: []),
               let json = String(data: data, encoding: .utf8) {
                return json
            }
            return String(describing: value)
        }
        if let array = value as? [Any?] {
            return array.compactMap { $0.map { String(describing: $0) } }.joined(separator: ",")
        }
        if let object = value as? [String: Any] {
            var values: [String] = []
            for (key, item) in object {
                if parameter.explode {
                    values.append("\(key)=\(item)")
                } else {
                    values.append(key)
                    values.append(String(describing: item))
                }
            }
            return values.joined(separator: ",")
        }
        if let date = value as? Date {
            return ISO8601DateFormatter().string(from: date)
        }
        return String(describing: value)
    }

    private func urlEncode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? value
    }
}
