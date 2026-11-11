import Foundation

public class ChatAnthropicApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Anthropic Claude message
    public func createV1Message(body: AnthropicMessageCreateRequest, anthropicVersion: String) async throws -> AnthropicMessage? {
        let requestHeaders = buildRequestHeaders(
            [
                "anthropic-version": HeaderParameterSpec(value: anthropicVersion, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post("/anthropic/v1/messages", body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: AnthropicMessage.self)
    }

    /// Anthropic count message tokens
    public func createV1MessagesCountToken(body: AnthropicCountMessageTokensRequest, anthropicVersion: String) async throws -> AnthropicCountMessageTokensResponse? {
        let requestHeaders = buildRequestHeaders(
            [
                "anthropic-version": HeaderParameterSpec(value: anthropicVersion, style: "simple", explode: false, contentType: nil),
            ],
            [:]
        )
        return try await client.post("/anthropic/v1/messages/count_tokens", body: body, params: nil, headers: requestHeaders, contentType: "application/json", responseType: AnthropicCountMessageTokensResponse.self)
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
