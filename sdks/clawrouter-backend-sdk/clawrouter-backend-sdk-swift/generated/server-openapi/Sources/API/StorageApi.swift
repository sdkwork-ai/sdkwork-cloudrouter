import Foundation

public class StorageApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// List storage buckets
    public func ossBucketsList(cursor: String? = nil, limit: String? = nil, status: String? = nil) async throws -> OssBucketsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "limit", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/storage/buckets"), query), responseType: OssBucketsListResult.self)
    }

    /// Create storage bucket
    public func ossBucketsCreate(body: CreateStorageBucketRequest, idempotencyKey: String) async throws -> OssBucketsCreateResult? {
        let requestHeaders = buildRequestHeaders(
            [
                "Idempotency-Key": HeaderParameterSpec(value: idempotencyKey, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post(ApiPaths.backendPath("/storage/buckets"), body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: OssBucketsCreateResult.self)
    }

    /// Update storage bucket status
    public func ossBucketsUpdate(bucketId: String, body: UpdateStorageBucketRequest) async throws -> OssBucketsUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/storage/buckets/\(serializePathParameter(bucketId, PathParameterSpec(name: "bucketId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OssBucketsUpdateResult.self)
    }

    /// List default storage bucket routes
    public func ossDefaultBucketsList(logicalScope: String? = nil) async throws -> OssDefaultBucketsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "logical_scope", value: logicalScope, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/storage/default_buckets"), query), responseType: OssDefaultBucketsListResult.self)
    }

    /// Set default storage bucket route
    public func ossDefaultBucketsUpdate(logicalScope: String, body: SetStorageDefaultBucketRequest) async throws -> OssDefaultBucketsUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/storage/default_buckets/\(serializePathParameter(logicalScope, PathParameterSpec(name: "logicalScope", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OssDefaultBucketsUpdateResult.self)
    }

    /// List storage garbage collection jobs
    public func ossGcJobsList(cursor: String? = nil, limit: String? = nil, status: String? = nil) async throws -> OssGcJobsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "limit", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/storage/gc_jobs"), query), responseType: OssGcJobsListResult.self)
    }

    /// Create storage garbage collection job
    public func ossGcJobsCreate(body: CreateStorageGarbageCollectionJobRequest, idempotencyKey: String) async throws -> OssGcJobsCreateResult? {
        let requestHeaders = buildRequestHeaders(
            [
                "Idempotency-Key": HeaderParameterSpec(value: idempotencyKey, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post(ApiPaths.backendPath("/storage/gc_jobs"), body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: OssGcJobsCreateResult.self)
    }

    /// List storage providers
    public func ossProvidersList() async throws -> OssProvidersListResult? {
        return try await client.get(ApiPaths.backendPath("/storage/providers"), responseType: OssProvidersListResult.self)
    }

    /// Create storage provider
    public func ossProvidersCreate(body: CreateStorageProviderRequest, idempotencyKey: String) async throws -> OssProvidersCreateResult? {
        let requestHeaders = buildRequestHeaders(
            [
                "Idempotency-Key": HeaderParameterSpec(value: idempotencyKey, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post(ApiPaths.backendPath("/storage/providers"), body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: OssProvidersCreateResult.self)
    }

    /// Update storage provider status
    public func ossProvidersUpdate(providerId: String, body: UpdateStorageProviderRequest) async throws -> OssProvidersUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/storage/providers/\(serializePathParameter(providerId, PathParameterSpec(name: "providerId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OssProvidersUpdateResult.self)
    }

    /// Check storage provider health
    public func ossProvidersHealthChecksCreate(providerId: String) async throws -> OssProvidersHealthChecksCreateResult? {
        return try await client.post(ApiPaths.backendPath("/storage/providers/\(serializePathParameter(providerId, PathParameterSpec(name: "providerId", style: "simple", explode: false)))/health_check"), body: nil, responseType: OssProvidersHealthChecksCreateResult.self)
    }

    /// List storage quota policies
    public func ossQuotasList() async throws -> OssQuotasListResult? {
        return try await client.get(ApiPaths.backendPath("/storage/quotas"), responseType: OssQuotasListResult.self)
    }

    /// Create storage quota policy
    public func ossQuotasCreate(body: CreateStorageQuotaPolicyRequest, idempotencyKey: String) async throws -> OssQuotasCreateResult? {
        let requestHeaders = buildRequestHeaders(
            [
                "Idempotency-Key": HeaderParameterSpec(value: idempotencyKey, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post(ApiPaths.backendPath("/storage/quotas"), body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: OssQuotasCreateResult.self)
    }

    /// List storage reconciliation runs
    public func ossReconciliationRunsList(cursor: String? = nil, limit: String? = nil, runType: String? = nil, status: String? = nil) async throws -> OssReconciliationRunsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "limit", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "run_type", value: runType, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/storage/reconciliation_runs"), query), responseType: OssReconciliationRunsListResult.self)
    }

    /// Create storage reconciliation run
    public func ossReconciliationRunsCreate(body: CreateStorageReconciliationRunRequest, idempotencyKey: String) async throws -> OssReconciliationRunsCreateResult? {
        let requestHeaders = buildRequestHeaders(
            [
                "Idempotency-Key": HeaderParameterSpec(value: idempotencyKey, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post(ApiPaths.backendPath("/storage/reconciliation_runs"), body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: OssReconciliationRunsCreateResult.self)
    }

    /// List storage usage counters
    public func ossUsageList(cursor: String? = nil, limit: String? = nil, scopeType: String? = nil, scopeId: String? = nil) async throws -> OssUsageListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "limit", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "scope_type", value: scopeType, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "scope_id", value: scopeId, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/storage/usage"), query), responseType: OssUsageListResult.self)
    }

    /// List storage usage ledger
    public func ossUsageLedgerList(cursor: String? = nil, limit: String? = nil, scopeType: String? = nil, scopeId: String? = nil) async throws -> OssUsageLedgerListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "limit", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "scope_type", value: scopeType, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "scope_id", value: scopeId, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/storage/usage/ledger"), query), responseType: OssUsageLedgerListResult.self)
    }

    /// List storage usage snapshots
    public func ossUsageSnapshotsList(cursor: String? = nil, limit: String? = nil, scopeType: String? = nil, scopeId: String? = nil) async throws -> OssUsageSnapshotsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "limit", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "scope_type", value: scopeType, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "scope_id", value: scopeId, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/storage/usage/snapshots"), query), responseType: OssUsageSnapshotsListResult.self)
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
