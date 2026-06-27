import Foundation
import SDKworkCommon

public class SdkworkAppClient {
    private let httpClient: HttpClient
    public let ai: AiApi
    public let chat: ChatApi
    public let iam: IamApi
    public let notification: NotificationApi
    public let runtime: RuntimeApi
    public let system: SystemApi

    public init(baseURL: String) {
        self.httpClient = HttpClient(baseURL: baseURL)
        self.ai = AiApi(client: httpClient)
        self.chat = ChatApi(client: httpClient)
        self.iam = IamApi(client: httpClient)
        self.notification = NotificationApi(client: httpClient)
        self.runtime = RuntimeApi(client: httpClient)
        self.system = SystemApi(client: httpClient)
    }

    public init(config: SdkConfig) {
        self.httpClient = HttpClient(config: config)
        self.ai = AiApi(client: httpClient)
        self.chat = ChatApi(client: httpClient)
        self.iam = IamApi(client: httpClient)
        self.notification = NotificationApi(client: httpClient)
        self.runtime = RuntimeApi(client: httpClient)
        self.system = SystemApi(client: httpClient)
    }
    public func setAuthToken(_ token: String) -> SdkworkAppClient {
        httpClient.setAuthToken(token)
        return self
    }

    public func setAccessToken(_ token: String) -> SdkworkAppClient {
        httpClient.setAccessToken(token)
        return self
    }

    public func setHeader(_ key: String, value: String) -> SdkworkAppClient {
        httpClient.setHeader(key, value: value)
        return self
    }
}
