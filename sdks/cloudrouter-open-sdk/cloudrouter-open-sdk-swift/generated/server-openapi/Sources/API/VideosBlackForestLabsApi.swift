import Foundation

public class VideosBlackForestLabsApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Black Forest Labs FLUX 3 video generation
    public func createFlux3Video(body: BlackForestLabsVideoGenerationRequest) async throws -> BlackForestLabsVideoGenerationTask? {
        return try await client.post("/black_forest_labs/v1/flux-3-video", body: body, params: nil, headers: nil, contentType: "application/json", responseType: BlackForestLabsVideoGenerationTask.self)
    }



}
