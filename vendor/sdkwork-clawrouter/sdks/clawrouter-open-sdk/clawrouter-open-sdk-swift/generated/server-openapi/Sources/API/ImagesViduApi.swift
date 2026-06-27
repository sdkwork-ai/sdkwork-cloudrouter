import Foundation

public class ImagesViduApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Vidu reference to image
    public func createEntV2Reference2image(body: ViduReferenceToImageRequest) async throws -> ViduImageGenerationTask? {
        return try await client.post(ApiPaths.aiPath("/vidu/ent/v2/reference2image"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: ViduImageGenerationTask.self)
    }



}
