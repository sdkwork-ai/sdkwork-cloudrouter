import Foundation

public class ImagesVolcengineApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Volcengine Ark image generation
    public func createApiV3ImagesGeneration(body: VolcengineImageGenerationRequest) async throws -> VolcengineImageGenerationResponse? {
        return try await client.post("/volcengine/api/v3/images/generations", body: body, params: nil, headers: nil, contentType: "application/json", responseType: VolcengineImageGenerationResponse.self)
    }



}
