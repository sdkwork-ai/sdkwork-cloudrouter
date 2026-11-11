import Foundation

public class ImagesZhipuApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Zhipu CogView image generation
    public func createApiPaasV4ImagesGeneration(body: ZhipuImageGenerationRequest) async throws -> ZhipuImageGenerationResponse? {
        return try await client.post("/zhipu/api/paas/v4/images/generations", body: body, params: nil, headers: nil, contentType: "application/json", responseType: ZhipuImageGenerationResponse.self)
    }



}
