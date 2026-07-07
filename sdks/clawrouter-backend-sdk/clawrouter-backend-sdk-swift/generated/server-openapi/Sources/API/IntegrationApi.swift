import Foundation

public class IntegrationApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// List
    public func channelsList() async throws -> ChannelsListResult? {
        return try await client.get(ApiPaths.backendPath("/integration/channels"), responseType: ChannelsListResult.self)
    }

    /// Create
    public func channelsCreate() async throws -> ChannelsCreateResult? {
        return try await client.post(ApiPaths.backendPath("/integration/channels"), body: nil, responseType: ChannelsCreateResult.self)
    }

    /// Update
    public func channelsUpdate() async throws -> ChannelsUpdateResult? {
        return try await client.put(ApiPaths.backendPath("/integration/channels"), body: nil, responseType: ChannelsUpdateResult.self)
    }

    /// Delete
    public func channelsDelete(channelId: String) async throws -> ChannelsDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/integration/channels/\(serializePathParameter(channelId, PathParameterSpec(name: "channelId", style: "simple", explode: false)))"), responseType: ChannelsDeleteResult.self)
    }

    /// Verify
    public func channelsVerify(channelId: String) async throws -> ChannelsVerifyResult? {
        return try await client.post(ApiPaths.backendPath("/integration/channels/\(serializePathParameter(channelId, PathParameterSpec(name: "channelId", style: "simple", explode: false)))/verify"), body: nil, responseType: ChannelsVerifyResult.self)
    }

    /// List
    public func providerSecretsList() async throws -> ProviderSecretsListResult? {
        return try await client.get(ApiPaths.backendPath("/integration/provider_secrets"), responseType: ProviderSecretsListResult.self)
    }

    /// Create
    public func providerSecretsCreate() async throws -> ProviderSecretsCreateResult? {
        return try await client.post(ApiPaths.backendPath("/integration/provider_secrets"), body: nil, responseType: ProviderSecretsCreateResult.self)
    }

    /// Update
    public func providerSecretsUpdate() async throws -> ProviderSecretsUpdateResult? {
        return try await client.put(ApiPaths.backendPath("/integration/provider_secrets"), body: nil, responseType: ProviderSecretsUpdateResult.self)
    }

    /// Delete
    public func providerSecretsDelete(secretId: String) async throws -> ProviderSecretsDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/integration/provider_secrets/\(serializePathParameter(secretId, PathParameterSpec(name: "secretId", style: "simple", explode: false)))"), responseType: ProviderSecretsDeleteResult.self)
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
