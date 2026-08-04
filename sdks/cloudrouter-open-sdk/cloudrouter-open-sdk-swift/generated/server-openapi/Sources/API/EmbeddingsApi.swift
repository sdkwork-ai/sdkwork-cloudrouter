import Foundation

public class EmbeddingsApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Create embeddings
    public func create(body: OpenAiEmbeddingsRequest) async throws -> OpenAiEmbeddingList? {
        return try await client.post(ApiPaths.aiPath("/embeddings"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiEmbeddingList.self)
    }



}
