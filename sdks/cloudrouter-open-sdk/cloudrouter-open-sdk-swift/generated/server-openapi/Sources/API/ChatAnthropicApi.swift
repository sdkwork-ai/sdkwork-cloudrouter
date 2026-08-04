import Foundation

public class ChatAnthropicApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Anthropic Claude message
    public func createV1Message(body: AnthropicMessageCreateRequest) async throws -> AnthropicMessage? {
        return try await client.post(ApiPaths.aiPath("/anthropic/v1/messages"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: AnthropicMessage.self)
    }

    /// Anthropic count message tokens
    public func createV1MessagesCountToken(body: AnthropicCountMessageTokensRequest) async throws -> AnthropicCountMessageTokensResponse? {
        return try await client.post(ApiPaths.aiPath("/anthropic/v1/messages/count_tokens"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: AnthropicCountMessageTokensResponse.self)
    }



}
