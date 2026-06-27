import Foundation

public class CompletionApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Create completion
    public func create(body: OpenAiCompletionCreateRequest) async throws -> OpenAiCompletion? {
        return try await client.post(ApiPaths.aiPath("/completions"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiCompletion.self)
    }



}
