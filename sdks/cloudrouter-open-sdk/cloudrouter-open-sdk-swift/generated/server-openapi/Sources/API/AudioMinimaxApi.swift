import Foundation

public class AudioMinimaxApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// MiniMax speech synthesis
    public func createV1T2aV(body: MinimaxTextToSpeechRequest) async throws -> MinimaxTextToSpeechResponse? {
        return try await client.post("/minimax/v1/t2a_v2", body: body, params: nil, headers: nil, contentType: "application/json", responseType: MinimaxTextToSpeechResponse.self)
    }



}
