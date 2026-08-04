import Foundation

public class ImagesApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Create image edit
    public func createEdit(body: OpenAiImageEditRequest) async throws -> OpenAiImageList? {
        return try await client.post(ApiPaths.aiPath("/images/edits"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiImageList.self)
    }

    /// Create image
    public func createGeneration(body: OpenAiImageGenerationRequest) async throws -> OpenAiImageList? {
        return try await client.post(ApiPaths.aiPath("/images/generations"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiImageList.self)
    }

    /// Create image variation
    public func createVariation(body: OpenAiImageVariationRequest) async throws -> OpenAiImageList? {
        return try await client.post(ApiPaths.aiPath("/images/variations"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiImageList.self)
    }



}
