import Foundation

public class SitesApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// List
    public func siteCatalogList() async throws -> SiteCatalogListResult? {
        return try await client.get(ApiPaths.backendPath("/sites"), responseType: SiteCatalogListResult.self)
    }

    /// Create
    public func siteCreate() async throws -> SiteCreateResult? {
        return try await client.post(ApiPaths.backendPath("/sites"), body: nil, responseType: SiteCreateResult.self)
    }

    /// Delete
    public func siteDelete(siteId: String) async throws -> SiteDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/sites/\(serializePathParameter(siteId, PathParameterSpec(name: "siteId", style: "simple", explode: false)))"), responseType: SiteDeleteResult.self)
    }

    /// Update
    public func siteUpdate(siteId: String) async throws -> SiteUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/sites/\(serializePathParameter(siteId, PathParameterSpec(name: "siteId", style: "simple", explode: false)))"), body: nil, responseType: SiteUpdateResult.self)
    }

    /// List
    public func siteChannelsList(siteId: String) async throws -> SiteChannelsListResult? {
        return try await client.get(ApiPaths.backendPath("/sites/\(serializePathParameter(siteId, PathParameterSpec(name: "siteId", style: "simple", explode: false)))/channels"), responseType: SiteChannelsListResult.self)
    }

    /// Create
    public func healthCheckCreate(siteId: String) async throws -> HealthCheckCreateResult? {
        return try await client.post(ApiPaths.backendPath("/sites/\(serializePathParameter(siteId, PathParameterSpec(name: "siteId", style: "simple", explode: false)))/health_check"), body: nil, responseType: HealthCheckCreateResult.self)
    }

    /// Create
    public func testConnectionCreate(siteId: String) async throws -> TestConnectionCreateResult? {
        return try await client.post(ApiPaths.backendPath("/sites/\(serializePathParameter(siteId, PathParameterSpec(name: "siteId", style: "simple", explode: false)))/test_connection"), body: nil, responseType: TestConnectionCreateResult.self)
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


}
