import Foundation

public class ModerationsApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Create moderation
    public func create(body: OpenAiModerationCreateRequest) async throws -> OpenAiModeration? {
        return try await client.post(ApiPaths.aiPath("/moderations"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiModeration.self)
    }



}
