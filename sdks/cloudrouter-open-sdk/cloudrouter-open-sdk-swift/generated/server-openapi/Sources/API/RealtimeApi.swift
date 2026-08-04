import Foundation

public class RealtimeApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Create realtime call
    public func createCall(body: OpenAiRealtimeCallCreateRequest) async throws -> String? {
        return try await client.post(ApiPaths.aiPath("/realtime/calls"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: String.self)
    }

    /// Accept realtime call
    public func createCallsAccept(callId: String, body: OpenAiRealtimeCallActionRequest) async throws -> OpenAiRealtimeCall? {
        return try await client.post(ApiPaths.aiPath("/realtime/calls/\(serializePathParameter(callId, PathParameterSpec(name: "call_id", style: "simple", explode: false)))/accept"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiRealtimeCall.self)
    }

    /// Hang up realtime call
    public func createCallsHangup(callId: String, body: OpenAiRealtimeCallActionRequest) async throws -> OpenAiRealtimeCall? {
        return try await client.post(ApiPaths.aiPath("/realtime/calls/\(serializePathParameter(callId, PathParameterSpec(name: "call_id", style: "simple", explode: false)))/hangup"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiRealtimeCall.self)
    }

    /// Refer realtime call
    public func createCallsRefer(callId: String, body: OpenAiRealtimeCallReferRequest) async throws -> OpenAiRealtimeCall? {
        return try await client.post(ApiPaths.aiPath("/realtime/calls/\(serializePathParameter(callId, PathParameterSpec(name: "call_id", style: "simple", explode: false)))/refer"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiRealtimeCall.self)
    }

    /// Reject realtime call
    public func createCallsReject(callId: String, body: OpenAiRealtimeCallActionRequest) async throws -> OpenAiRealtimeCall? {
        return try await client.post(ApiPaths.aiPath("/realtime/calls/\(serializePathParameter(callId, PathParameterSpec(name: "call_id", style: "simple", explode: false)))/reject"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiRealtimeCall.self)
    }

    /// Create realtime client secret
    public func createClientSecret(body: OpenAiRealtimeClientSecretCreateRequest) async throws -> OpenAiRealtimeClientSecret? {
        return try await client.post(ApiPaths.aiPath("/realtime/client_secrets"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiRealtimeClientSecret.self)
    }

    /// Create realtime session
    public func createSession(body: OpenAiRealtimeSessionCreateRequest) async throws -> OpenAiRealtimeSession? {
        return try await client.post(ApiPaths.aiPath("/realtime/sessions"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiRealtimeSession.self)
    }

    /// Create realtime transcription session
    public func createTranscriptionSession(body: OpenAiRealtimeTranscriptionSessionCreateRequest) async throws -> OpenAiRealtimeTranscriptionSession? {
        return try await client.post(ApiPaths.aiPath("/realtime/transcription_sessions"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiRealtimeTranscriptionSession.self)
    }

    /// Create realtime translation session
    public func createTranslation(body: OpenAiRealtimeTranslationSessionCreateRequest) async throws -> OpenAiRealtimeTranslationSession? {
        return try await client.post(ApiPaths.aiPath("/realtime/translations"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiRealtimeTranslationSession.self)
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
