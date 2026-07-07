import Foundation

public class IamApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// List
    public func apiKeysList() async throws -> ApiKeysListResult? {
        return try await client.get(ApiPaths.appPath("/iam/api_keys"), responseType: ApiKeysListResult.self)
    }

    /// Create
    public func apiKeysCreate() async throws -> ApiKeysCreateResult? {
        return try await client.post(ApiPaths.appPath("/iam/api_keys"), body: nil, responseType: ApiKeysCreateResult.self)
    }

    /// Delete
    public func apiKeysDelete(apiKeyId: String) async throws -> ApiKeysDeleteResult? {
        return try await client.delete(ApiPaths.appPath("/iam/api_keys/\(serializePathParameter(apiKeyId, PathParameterSpec(name: "apiKeyId", style: "simple", explode: false)))"), responseType: ApiKeysDeleteResult.self)
    }

    /// Update
    public func apiKeysUpdate(apiKeyId: String) async throws -> ApiKeysUpdateResult? {
        return try await client.patch(ApiPaths.appPath("/iam/api_keys/\(serializePathParameter(apiKeyId, PathParameterSpec(name: "apiKeyId", style: "simple", explode: false)))"), body: nil, responseType: ApiKeysUpdateResult.self)
    }

    /// Retrieve
    public func usersSettingsRetrieve() async throws -> UsersSettingsRetrieveResult? {
        return try await client.get(ApiPaths.appPath("/iam/users/settings"), responseType: UsersSettingsRetrieveResult.self)
    }

    /// Update
    public func usersSettingsUpdate() async throws -> UsersSettingsUpdateResult? {
        return try await client.put(ApiPaths.appPath("/iam/users/settings"), body: nil, responseType: UsersSettingsUpdateResult.self)
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
