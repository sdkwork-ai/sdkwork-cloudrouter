import Foundation

public class ToolApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Fetch a web page
    public func createFetch(body: OpenAiDeepSeekWebFetchRequest) async throws -> OpenAiDeepSeekWebFetchResponse? {
        return try await client.post(ApiPaths.aiPath("/tools/fetch"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiDeepSeekWebFetchResponse.self)
    }

    /// Search the web
    public func search(body: OpenAiDeepSeekWebSearchRequest) async throws -> OpenAiDeepSeekWebSearchResponse? {
        return try await client.post(ApiPaths.aiPath("/tools/search"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiDeepSeekWebSearchResponse.self)
    }



}
