import Foundation
import SDKworkCommon

public class SdkworkBackendClient {
    private let httpClient: HttpClient
    public let ai: AiApi
    public let integration: IntegrationApi
    public let sites: SitesApi
    public let system: SystemApi

    public init(baseURL: String) {
        self.httpClient = HttpClient(baseURL: baseURL)
        self.ai = AiApi(client: httpClient)
        self.integration = IntegrationApi(client: httpClient)
        self.sites = SitesApi(client: httpClient)
        self.system = SystemApi(client: httpClient)
    }

    public init(config: SdkConfig) {
        self.httpClient = HttpClient(config: config)
        self.ai = AiApi(client: httpClient)
        self.integration = IntegrationApi(client: httpClient)
        self.sites = SitesApi(client: httpClient)
        self.system = SystemApi(client: httpClient)
    }
    public func setAuthToken(_ token: String) -> SdkworkBackendClient {
        httpClient.setAuthToken(token)
        return self
    }

    public func setAccessToken(_ token: String) -> SdkworkBackendClient {
        httpClient.setAccessToken(token)
        return self
    }

    public func setHeader(_ key: String, value: String) -> SdkworkBackendClient {
        httpClient.setHeader(key, value: value)
        return self
    }
}
