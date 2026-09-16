import Foundation

public class AudioMinimaxApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Minimax create music generation
    public func createV1MusicGeneration(body: MiniMaxMusicGenerationRequest) async throws -> MiniMaxMusicGenerationResponse? {
        return try await client.post(ApiPaths.aiPath("/minimax/v1/music_generation"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: MiniMaxMusicGenerationResponse.self)
    }



}
