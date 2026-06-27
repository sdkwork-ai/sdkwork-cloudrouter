import Foundation

public class MessagingApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Messaging route simulation
    public func diagnosticsRouteSimulationCreate(body: MessagingRouteSimulationRequest) async throws -> DiagnosticsRouteSimulationCreateResult? {
        return try await client.post(ApiPaths.backendPath("/messaging/diagnostics/route_simulation"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: DiagnosticsRouteSimulationCreateResult.self)
    }

    /// Messaging test send
    public func diagnosticsTestSendsCreate(body: MessagingTestSendRequest, idempotencyKey: String) async throws -> DiagnosticsTestSendsCreateResult? {
        let requestHeaders = buildRequestHeaders(
            [
                "Idempotency-Key": HeaderParameterSpec(value: idempotencyKey, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post(ApiPaths.backendPath("/messaging/diagnostics/test_sends"), body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: DiagnosticsTestSendsCreateResult.self)
    }

    /// Messaging provider accounts list
    public func providerAccountsList(page: String? = nil, pageSize: String? = nil, q: String? = nil, status: String? = nil, channel: String? = nil, providerCode: String? = nil) async throws -> ProviderAccountsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "channel", value: channel, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "provider_code", value: providerCode, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/provider_accounts"), query), responseType: ProviderAccountsListResult.self)
    }

    /// Messaging provider account create
    public func providerAccountsCreate(body: MessagingProviderAccountCreateRequest, idempotencyKey: String) async throws -> ProviderAccountsCreateResult? {
        let requestHeaders = buildRequestHeaders(
            [
                "Idempotency-Key": HeaderParameterSpec(value: idempotencyKey, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post(ApiPaths.backendPath("/messaging/provider_accounts"), body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: ProviderAccountsCreateResult.self)
    }

    /// Messaging rate limit buckets list
    public func rateLimitBucketsList(page: String? = nil, pageSize: String? = nil, sceneCode: String? = nil, channel: String? = nil, targetHash: String? = nil, ipHash: String? = nil, deviceHash: String? = nil) async throws -> RateLimitBucketsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "scene_code", value: sceneCode, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "channel", value: channel, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "target_hash", value: targetHash, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "ip_hash", value: ipHash, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "device_hash", value: deviceHash, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/rate_limit_buckets"), query), responseType: RateLimitBucketsListResult.self)
    }

    /// Messaging route rules list
    public func routeRulesList(page: String? = nil, pageSize: String? = nil, q: String? = nil, status: String? = nil, channel: String? = nil, providerCode: String? = nil) async throws -> RouteRulesListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "channel", value: channel, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "provider_code", value: providerCode, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/route_rules"), query), responseType: RouteRulesListResult.self)
    }

    /// Messaging route rule create
    public func routeRulesCreate(body: MessagingRouteRuleCreateRequest, idempotencyKey: String) async throws -> RouteRulesCreateResult? {
        let requestHeaders = buildRequestHeaders(
            [
                "Idempotency-Key": HeaderParameterSpec(value: idempotencyKey, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post(ApiPaths.backendPath("/messaging/route_rules"), body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: RouteRulesCreateResult.self)
    }

    /// Messaging send requests list
    public func sendRequestsList(page: String? = nil, pageSize: String? = nil, status: String? = nil, channel: String? = nil, sceneCode: String? = nil, providerCode: String? = nil, targetHash: String? = nil) async throws -> SendRequestsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "channel", value: channel, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "scene_code", value: sceneCode, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "provider_code", value: providerCode, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "target_hash", value: targetHash, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/send_requests"), query), responseType: SendRequestsListResult.self)
    }

    /// Messaging sender identities list
    public func senderIdentitiesList(page: String? = nil, pageSize: String? = nil, q: String? = nil, status: String? = nil, channel: String? = nil, providerCode: String? = nil) async throws -> SenderIdentitiesListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "channel", value: channel, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "provider_code", value: providerCode, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/sender_identities"), query), responseType: SenderIdentitiesListResult.self)
    }

    /// Messaging sender identity create
    public func senderIdentitiesCreate(body: MessagingSenderIdentityCreateRequest, idempotencyKey: String) async throws -> SenderIdentitiesCreateResult? {
        let requestHeaders = buildRequestHeaders(
            [
                "Idempotency-Key": HeaderParameterSpec(value: idempotencyKey, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post(ApiPaths.backendPath("/messaging/sender_identities"), body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: SenderIdentitiesCreateResult.self)
    }

    /// Messaging suppressions list
    public func suppressionsList(page: String? = nil, pageSize: String? = nil, status: String? = nil, channel: String? = nil, targetHash: String? = nil, reasonCode: String? = nil) async throws -> SuppressionsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "channel", value: channel, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "target_hash", value: targetHash, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "reason_code", value: reasonCode, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/suppressions"), query), responseType: SuppressionsListResult.self)
    }

    /// Messaging suppression create
    public func suppressionsCreate(body: MessagingSuppressionCreateRequest, idempotencyKey: String) async throws -> SuppressionsCreateResult? {
        let requestHeaders = buildRequestHeaders(
            [
                "Idempotency-Key": HeaderParameterSpec(value: idempotencyKey, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post(ApiPaths.backendPath("/messaging/suppressions"), body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: SuppressionsCreateResult.self)
    }

    /// Messaging template send
    public func templateSendsCreate(body: MessagingTemplateSendRequest, idempotencyKey: String) async throws -> TemplateSendsCreateResult? {
        let requestHeaders = buildRequestHeaders(
            [
                "Idempotency-Key": HeaderParameterSpec(value: idempotencyKey, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post(ApiPaths.backendPath("/messaging/template_sends"), body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: TemplateSendsCreateResult.self)
    }

    /// Messaging templates list
    public func templatesList(page: String? = nil, pageSize: String? = nil, q: String? = nil, status: String? = nil, channel: String? = nil, providerCode: String? = nil) async throws -> TemplatesListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "channel", value: channel, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "provider_code", value: providerCode, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/templates"), query), responseType: TemplatesListResult.self)
    }

    /// Messaging template create
    public func templatesCreate(body: MessagingTemplateCreateRequest, idempotencyKey: String) async throws -> TemplatesCreateResult? {
        let requestHeaders = buildRequestHeaders(
            [
                "Idempotency-Key": HeaderParameterSpec(value: idempotencyKey, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post(ApiPaths.backendPath("/messaging/templates"), body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: TemplatesCreateResult.self)
    }

    /// Messaging template version publish
    public func templatesVersionsPublish(templateId: String, versionId: String) async throws -> TemplatesVersionsPublishResult? {
        return try await client.post(ApiPaths.backendPath("/messaging/templates/\(serializePathParameter(templateId, PathParameterSpec(name: "templateId", style: "simple", explode: false)))/versions/\(serializePathParameter(versionId, PathParameterSpec(name: "versionId", style: "simple", explode: false)))/publish"), body: nil, responseType: TemplatesVersionsPublishResult.self)
    }

    /// Verification policies list
    public func verificationPoliciesList(page: String? = nil, pageSize: String? = nil, q: String? = nil, status: String? = nil, channel: String? = nil, providerCode: String? = nil) async throws -> VerificationPoliciesListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "channel", value: channel, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "provider_code", value: providerCode, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/messaging/verification_policies"), query), responseType: VerificationPoliciesListResult.self)
    }

    /// Verification policy update
    public func verificationPoliciesUpdate(policyId: String, body: VerificationPolicyUpdateRequest) async throws -> VerificationPoliciesUpdateResult? {
        return try await client.put(ApiPaths.backendPath("/messaging/verification_policies/\(serializePathParameter(policyId, PathParameterSpec(name: "policyId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: VerificationPoliciesUpdateResult.self)
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
