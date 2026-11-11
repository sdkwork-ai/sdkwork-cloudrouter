import Foundation

public class AudioAlibabaApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Alibaba Qwen TTS speech synthesis
    public func createApiV1ServicesAudioTtsSpeechSynthesizer(body: AlibabaSpeechRequest) async throws -> AlibabaSpeechResponse? {
        return try await client.post("/alibaba/api/v1/services/audio/tts/SpeechSynthesizer", body: body, params: nil, headers: nil, contentType: "application/json", responseType: AlibabaSpeechResponse.self)
    }



}
