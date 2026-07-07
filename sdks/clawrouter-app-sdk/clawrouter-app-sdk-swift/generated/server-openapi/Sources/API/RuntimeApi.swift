import Foundation

public class RuntimeApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// List
    public func invocationsList() async throws -> InvocationsListResult? {
        return try await client.get(ApiPaths.appPath("/runtime/invocations"), responseType: InvocationsListResult.self)
    }

    /// Create
    public func invocationsCreate() async throws -> InvocationsCreateResult? {
        return try await client.post(ApiPaths.appPath("/runtime/invocations"), body: nil, responseType: InvocationsCreateResult.self)
    }

    /// Retrieve
    public func invocationsRetrieve(invocationId: String) async throws -> InvocationsRetrieveResult? {
        return try await client.get(ApiPaths.appPath("/runtime/invocations/\(serializePathParameter(invocationId, PathParameterSpec(name: "invocationId", style: "simple", explode: false)))"), responseType: InvocationsRetrieveResult.self)
    }

    /// List
    public func artifactsList(invocationId: String) async throws -> ArtifactsListResult? {
        return try await client.get(ApiPaths.appPath("/runtime/invocations/\(serializePathParameter(invocationId, PathParameterSpec(name: "invocationId", style: "simple", explode: false)))/artifacts"), responseType: ArtifactsListResult.self)
    }

    /// Create
    public func artifactsCreate(invocationId: String) async throws -> ArtifactsCreateResult? {
        return try await client.post(ApiPaths.appPath("/runtime/invocations/\(serializePathParameter(invocationId, PathParameterSpec(name: "invocationId", style: "simple", explode: false)))/artifacts"), body: nil, responseType: ArtifactsCreateResult.self)
    }

    /// Create
    public func invocationsSubmit(invocationId: String) async throws -> InvocationsSubmitResult? {
        return try await client.post(ApiPaths.appPath("/runtime/invocations/\(serializePathParameter(invocationId, PathParameterSpec(name: "invocationId", style: "simple", explode: false)))/complete"), body: nil, responseType: InvocationsSubmitResult.self)
    }

    /// List
    public func invocationEventsList(invocationId: String) async throws -> InvocationEventsListResult? {
        return try await client.get(ApiPaths.appPath("/runtime/invocations/\(serializePathParameter(invocationId, PathParameterSpec(name: "invocationId", style: "simple", explode: false)))/events"), responseType: InvocationEventsListResult.self)
    }

    /// Create
    public func invocationEventsCreate(invocationId: String) async throws -> InvocationEventsCreateResult? {
        return try await client.post(ApiPaths.appPath("/runtime/invocations/\(serializePathParameter(invocationId, PathParameterSpec(name: "invocationId", style: "simple", explode: false)))/events"), body: nil, responseType: InvocationEventsCreateResult.self)
    }

    /// List
    public func invocationEventStreamsList(invocationId: String) async throws -> InvocationEventStreamsListResult? {
        return try await client.get(ApiPaths.appPath("/runtime/invocations/\(serializePathParameter(invocationId, PathParameterSpec(name: "invocationId", style: "simple", explode: false)))/events/stream"), responseType: InvocationEventStreamsListResult.self)
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
