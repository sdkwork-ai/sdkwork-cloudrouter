import Foundation

public class ChatTypesafeApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// TypeSafe AI System One decision
    public func createV1Systemone(body: TypeSafeSystemOneRequest) async throws -> TypeSafeSystemOneResponse? {
        return try await client.post("/typesafe/v1/systemone", body: body, params: nil, headers: nil, contentType: "application/json", responseType: TypeSafeSystemOneResponse.self)
    }



}
