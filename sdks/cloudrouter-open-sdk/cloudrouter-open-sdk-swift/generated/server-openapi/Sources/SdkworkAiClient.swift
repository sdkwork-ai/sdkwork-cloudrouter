import Foundation
import SDKworkCommon

public class SdkworkAiClient {
    private let httpClient: HttpClient
    public let filesAnthropic: FilesAnthropicApi
    public let chatAnthropic: ChatAnthropicApi
    public let batchesAnthropic: BatchesAnthropicApi
    public let responsesGoogle: ResponsesGoogleApi
    public let filesGoogle: FilesGoogleApi
    public let embeddingsGoogle: EmbeddingsGoogleApi
    public let chatGoogle: ChatGoogleApi
    public let videosKling: VideosKlingApi
    public let imagesMidjourney: ImagesMidjourneyApi
    public let imagesNanoBanana: ImagesNanoBananaApi
    public let audioSuno: AudioSunoApi
    public let assistants: AssistantsApi
    public let audio: AudioApi
    public let batches: BatchesApi
    public let chat: ChatApi
    public let completion: CompletionApi
    public let container: ContainerApi
    public let conversation: ConversationApi
    public let embeddings: EmbeddingsApi
    public let files: FilesApi
    public let images: ImagesApi
    public let models: ModelsApi
    public let moderations: ModerationsApi
    public let realtime: RealtimeApi
    public let responses: ResponsesApi
    public let threads: ThreadsApi
    public let uploads: UploadsApi
    public let vectorStores: VectorStoresApi
    public let video: VideoApi
    public let videosVidu: VideosViduApi
    public let imagesVidu: ImagesViduApi
    public let videosVolcengine: VideosVolcengineApi

    public init(baseURL: String) {
        self.httpClient = HttpClient(baseURL: baseURL)
        self.filesAnthropic = FilesAnthropicApi(client: httpClient)
        self.chatAnthropic = ChatAnthropicApi(client: httpClient)
        self.batchesAnthropic = BatchesAnthropicApi(client: httpClient)
        self.responsesGoogle = ResponsesGoogleApi(client: httpClient)
        self.filesGoogle = FilesGoogleApi(client: httpClient)
        self.embeddingsGoogle = EmbeddingsGoogleApi(client: httpClient)
        self.chatGoogle = ChatGoogleApi(client: httpClient)
        self.videosKling = VideosKlingApi(client: httpClient)
        self.imagesMidjourney = ImagesMidjourneyApi(client: httpClient)
        self.imagesNanoBanana = ImagesNanoBananaApi(client: httpClient)
        self.audioSuno = AudioSunoApi(client: httpClient)
        self.assistants = AssistantsApi(client: httpClient)
        self.audio = AudioApi(client: httpClient)
        self.batches = BatchesApi(client: httpClient)
        self.chat = ChatApi(client: httpClient)
        self.completion = CompletionApi(client: httpClient)
        self.container = ContainerApi(client: httpClient)
        self.conversation = ConversationApi(client: httpClient)
        self.embeddings = EmbeddingsApi(client: httpClient)
        self.files = FilesApi(client: httpClient)
        self.images = ImagesApi(client: httpClient)
        self.models = ModelsApi(client: httpClient)
        self.moderations = ModerationsApi(client: httpClient)
        self.realtime = RealtimeApi(client: httpClient)
        self.responses = ResponsesApi(client: httpClient)
        self.threads = ThreadsApi(client: httpClient)
        self.uploads = UploadsApi(client: httpClient)
        self.vectorStores = VectorStoresApi(client: httpClient)
        self.video = VideoApi(client: httpClient)
        self.videosVidu = VideosViduApi(client: httpClient)
        self.imagesVidu = ImagesViduApi(client: httpClient)
        self.videosVolcengine = VideosVolcengineApi(client: httpClient)
    }

    public init(config: SdkConfig) {
        self.httpClient = HttpClient(config: config)
        self.filesAnthropic = FilesAnthropicApi(client: httpClient)
        self.chatAnthropic = ChatAnthropicApi(client: httpClient)
        self.batchesAnthropic = BatchesAnthropicApi(client: httpClient)
        self.responsesGoogle = ResponsesGoogleApi(client: httpClient)
        self.filesGoogle = FilesGoogleApi(client: httpClient)
        self.embeddingsGoogle = EmbeddingsGoogleApi(client: httpClient)
        self.chatGoogle = ChatGoogleApi(client: httpClient)
        self.videosKling = VideosKlingApi(client: httpClient)
        self.imagesMidjourney = ImagesMidjourneyApi(client: httpClient)
        self.imagesNanoBanana = ImagesNanoBananaApi(client: httpClient)
        self.audioSuno = AudioSunoApi(client: httpClient)
        self.assistants = AssistantsApi(client: httpClient)
        self.audio = AudioApi(client: httpClient)
        self.batches = BatchesApi(client: httpClient)
        self.chat = ChatApi(client: httpClient)
        self.completion = CompletionApi(client: httpClient)
        self.container = ContainerApi(client: httpClient)
        self.conversation = ConversationApi(client: httpClient)
        self.embeddings = EmbeddingsApi(client: httpClient)
        self.files = FilesApi(client: httpClient)
        self.images = ImagesApi(client: httpClient)
        self.models = ModelsApi(client: httpClient)
        self.moderations = ModerationsApi(client: httpClient)
        self.realtime = RealtimeApi(client: httpClient)
        self.responses = ResponsesApi(client: httpClient)
        self.threads = ThreadsApi(client: httpClient)
        self.uploads = UploadsApi(client: httpClient)
        self.vectorStores = VectorStoresApi(client: httpClient)
        self.video = VideoApi(client: httpClient)
        self.videosVidu = VideosViduApi(client: httpClient)
        self.imagesVidu = ImagesViduApi(client: httpClient)
        self.videosVolcengine = VideosVolcengineApi(client: httpClient)
    }

    public func setApiKey(_ apiKey: String) -> SdkworkAiClient {
        httpClient.setApiKey(apiKey)
        return self
    }

    public func setAuthToken(_ token: String) -> SdkworkAiClient {
        httpClient.setAuthToken(token)
        return self
    }

    public func setAccessToken(_ token: String) -> SdkworkAiClient {
        httpClient.setAccessToken(token)
        return self
    }

    public func setHeader(_ key: String, value: String) -> SdkworkAiClient {
        httpClient.setHeader(key, value: value)
        return self
    }
}
