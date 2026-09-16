import Foundation

public class AudioVolcengineApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Volcengine create speech
    public func createApiV3AudioSpeech(body: OpenAiSpeechCreateRequest) async throws -> String? {
        return try await client.post(ApiPaths.aiPath("/volcengine/api/v3/audio/speech"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: String.self)
    }



}
