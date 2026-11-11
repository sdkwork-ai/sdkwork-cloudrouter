import Foundation

public class AudioViduApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Vidu text to audio
    public func createEntV2Text2audio(body: ViduTextToAudioRequest) async throws -> ViduAudioGenerationTask? {
        return try await client.post("/vidu/ent/v2/text2audio", body: body, params: nil, headers: nil, contentType: "application/json", responseType: ViduAudioGenerationTask.self)
    }

    /// Vidu timing to audio
    public func createEntV2Timing2audio(body: ViduTimingToAudioRequest) async throws -> ViduAudioGenerationTask? {
        return try await client.post("/vidu/ent/v2/timing2audio", body: body, params: nil, headers: nil, contentType: "application/json", responseType: ViduAudioGenerationTask.self)
    }



}
