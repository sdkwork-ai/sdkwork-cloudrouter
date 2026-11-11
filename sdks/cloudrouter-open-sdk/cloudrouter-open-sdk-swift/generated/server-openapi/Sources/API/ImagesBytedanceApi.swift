import Foundation

public class ImagesBytedanceApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// ByteDance Seedream image generation
    public func createApiV3ImagesGeneration(body: BytedanceImageGenerationRequest) async throws -> BytedanceImageGenerationResponse? {
        return try await client.post("/bytedance/api/v3/images/generations", body: body, params: nil, headers: nil, contentType: "application/json", responseType: BytedanceImageGenerationResponse.self)
    }



}
