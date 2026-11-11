import Foundation

public class AudioStabilityAiApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Stability AI text-to-audio (music and sound effects)
    public func createTextToAudio(body: StabilityAudioRequest) async throws -> String? {
        return try await client.post("/stability_ai/v2beta/audio/stable-audio-2/text-to-audio", body: body, params: nil, headers: nil, contentType: "multipart/form-data", responseType: String.self)
    }



}
