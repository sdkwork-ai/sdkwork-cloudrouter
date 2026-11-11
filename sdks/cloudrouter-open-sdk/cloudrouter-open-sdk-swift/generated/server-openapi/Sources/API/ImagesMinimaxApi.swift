import Foundation

public class ImagesMinimaxApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// MiniMax image generation
    public func createV1ImageGeneration(body: MinimaxImageGenerationRequest) async throws -> MinimaxImageGenerationResponse? {
        return try await client.post("/minimax/v1/image_generation", body: body, params: nil, headers: nil, contentType: "application/json", responseType: MinimaxImageGenerationResponse.self)
    }



}
