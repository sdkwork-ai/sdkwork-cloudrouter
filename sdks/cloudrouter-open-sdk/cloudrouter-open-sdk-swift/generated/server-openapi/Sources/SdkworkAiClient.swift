import Foundation
import SDKworkCommon

public class SdkworkAiClient {
    private let httpClient: HttpClient
    public let imagesAlibaba: ImagesAlibabaApi
    public let videosAlibaba: VideosAlibabaApi
    public let audioAlibaba: AudioAlibabaApi
    public let filesAnthropic: FilesAnthropicApi
    public let chatAnthropic: ChatAnthropicApi
    public let batchesAnthropic: BatchesAnthropicApi
    public let videosBlackForestLabs: VideosBlackForestLabsApi
    public let imagesBlackForestLabs: ImagesBlackForestLabsApi
    public let videosBytedance: VideosBytedanceApi
    public let imagesBytedance: ImagesBytedanceApi
    public let audioBytedance: AudioBytedanceApi
    public let musicElevenlabs: MusicElevenlabsApi
    public let audioElevenlabs: AudioElevenlabsApi
    public let responsesGoogle: ResponsesGoogleApi
    public let filesGoogle: FilesGoogleApi
    public let videosGoogle: VideosGoogleApi
    public let embeddingsGoogle: EmbeddingsGoogleApi
    public let chatGoogle: ChatGoogleApi
    public let imagesGoogle: ImagesGoogleApi
    public let videosJimeng: VideosJimengApi
    public let audioKling: AudioKlingApi
    public let imagesKling: ImagesKlingApi
    public let videosKling: VideosKlingApi
    public let videosLumaAi: VideosLumaAiApi
    public let videosMinimax: VideosMinimaxApi
    public let imagesMinimax: ImagesMinimaxApi
    public let musicMinimax: MusicMinimaxApi
    public let audioMinimax: AudioMinimaxApi
    public let musicMureka: MusicMurekaApi
    public let videosPixverse: VideosPixverseApi
    public let videosRunway: VideosRunwayApi
    public let imagesRunway: ImagesRunwayApi
    public let audioStabilityAi: AudioStabilityAiApi
    public let imagesStabilityAi: ImagesStabilityAiApi
    public let musicSuno: MusicSunoApi
    public let chatTypesafe: ChatTypesafeApi
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
    public let tool: ToolApi
    public let uploads: UploadsApi
    public let vectorStores: VectorStoresApi
    public let video: VideoApi
    public let videosVidu: VideosViduApi
    public let imagesVidu: ImagesViduApi
    public let audioVidu: AudioViduApi
    public let audioVolcengine: AudioVolcengineApi
    public let videosVolcengine: VideosVolcengineApi
    public let imagesVolcengine: ImagesVolcengineApi
    public let imagesXai: ImagesXaiApi
    public let videosXai: VideosXaiApi
    public let videosZhipu: VideosZhipuApi
    public let imagesZhipu: ImagesZhipuApi

    public init(baseURL: String) {
        self.httpClient = HttpClient(baseURL: baseURL)
        self.imagesAlibaba = ImagesAlibabaApi(client: httpClient)
        self.videosAlibaba = VideosAlibabaApi(client: httpClient)
        self.audioAlibaba = AudioAlibabaApi(client: httpClient)
        self.filesAnthropic = FilesAnthropicApi(client: httpClient)
        self.chatAnthropic = ChatAnthropicApi(client: httpClient)
        self.batchesAnthropic = BatchesAnthropicApi(client: httpClient)
        self.videosBlackForestLabs = VideosBlackForestLabsApi(client: httpClient)
        self.imagesBlackForestLabs = ImagesBlackForestLabsApi(client: httpClient)
        self.videosBytedance = VideosBytedanceApi(client: httpClient)
        self.imagesBytedance = ImagesBytedanceApi(client: httpClient)
        self.audioBytedance = AudioBytedanceApi(client: httpClient)
        self.musicElevenlabs = MusicElevenlabsApi(client: httpClient)
        self.audioElevenlabs = AudioElevenlabsApi(client: httpClient)
        self.responsesGoogle = ResponsesGoogleApi(client: httpClient)
        self.filesGoogle = FilesGoogleApi(client: httpClient)
        self.videosGoogle = VideosGoogleApi(client: httpClient)
        self.embeddingsGoogle = EmbeddingsGoogleApi(client: httpClient)
        self.chatGoogle = ChatGoogleApi(client: httpClient)
        self.imagesGoogle = ImagesGoogleApi(client: httpClient)
        self.videosJimeng = VideosJimengApi(client: httpClient)
        self.audioKling = AudioKlingApi(client: httpClient)
        self.imagesKling = ImagesKlingApi(client: httpClient)
        self.videosKling = VideosKlingApi(client: httpClient)
        self.videosLumaAi = VideosLumaAiApi(client: httpClient)
        self.videosMinimax = VideosMinimaxApi(client: httpClient)
        self.imagesMinimax = ImagesMinimaxApi(client: httpClient)
        self.musicMinimax = MusicMinimaxApi(client: httpClient)
        self.audioMinimax = AudioMinimaxApi(client: httpClient)
        self.musicMureka = MusicMurekaApi(client: httpClient)
        self.videosPixverse = VideosPixverseApi(client: httpClient)
        self.videosRunway = VideosRunwayApi(client: httpClient)
        self.imagesRunway = ImagesRunwayApi(client: httpClient)
        self.audioStabilityAi = AudioStabilityAiApi(client: httpClient)
        self.imagesStabilityAi = ImagesStabilityAiApi(client: httpClient)
        self.musicSuno = MusicSunoApi(client: httpClient)
        self.chatTypesafe = ChatTypesafeApi(client: httpClient)
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
        self.tool = ToolApi(client: httpClient)
        self.uploads = UploadsApi(client: httpClient)
        self.vectorStores = VectorStoresApi(client: httpClient)
        self.video = VideoApi(client: httpClient)
        self.videosVidu = VideosViduApi(client: httpClient)
        self.imagesVidu = ImagesViduApi(client: httpClient)
        self.audioVidu = AudioViduApi(client: httpClient)
        self.audioVolcengine = AudioVolcengineApi(client: httpClient)
        self.videosVolcengine = VideosVolcengineApi(client: httpClient)
        self.imagesVolcengine = ImagesVolcengineApi(client: httpClient)
        self.imagesXai = ImagesXaiApi(client: httpClient)
        self.videosXai = VideosXaiApi(client: httpClient)
        self.videosZhipu = VideosZhipuApi(client: httpClient)
        self.imagesZhipu = ImagesZhipuApi(client: httpClient)
    }

    public init(config: SdkConfig) {
        self.httpClient = HttpClient(config: config)
        self.imagesAlibaba = ImagesAlibabaApi(client: httpClient)
        self.videosAlibaba = VideosAlibabaApi(client: httpClient)
        self.audioAlibaba = AudioAlibabaApi(client: httpClient)
        self.filesAnthropic = FilesAnthropicApi(client: httpClient)
        self.chatAnthropic = ChatAnthropicApi(client: httpClient)
        self.batchesAnthropic = BatchesAnthropicApi(client: httpClient)
        self.videosBlackForestLabs = VideosBlackForestLabsApi(client: httpClient)
        self.imagesBlackForestLabs = ImagesBlackForestLabsApi(client: httpClient)
        self.videosBytedance = VideosBytedanceApi(client: httpClient)
        self.imagesBytedance = ImagesBytedanceApi(client: httpClient)
        self.audioBytedance = AudioBytedanceApi(client: httpClient)
        self.musicElevenlabs = MusicElevenlabsApi(client: httpClient)
        self.audioElevenlabs = AudioElevenlabsApi(client: httpClient)
        self.responsesGoogle = ResponsesGoogleApi(client: httpClient)
        self.filesGoogle = FilesGoogleApi(client: httpClient)
        self.videosGoogle = VideosGoogleApi(client: httpClient)
        self.embeddingsGoogle = EmbeddingsGoogleApi(client: httpClient)
        self.chatGoogle = ChatGoogleApi(client: httpClient)
        self.imagesGoogle = ImagesGoogleApi(client: httpClient)
        self.videosJimeng = VideosJimengApi(client: httpClient)
        self.audioKling = AudioKlingApi(client: httpClient)
        self.imagesKling = ImagesKlingApi(client: httpClient)
        self.videosKling = VideosKlingApi(client: httpClient)
        self.videosLumaAi = VideosLumaAiApi(client: httpClient)
        self.videosMinimax = VideosMinimaxApi(client: httpClient)
        self.imagesMinimax = ImagesMinimaxApi(client: httpClient)
        self.musicMinimax = MusicMinimaxApi(client: httpClient)
        self.audioMinimax = AudioMinimaxApi(client: httpClient)
        self.musicMureka = MusicMurekaApi(client: httpClient)
        self.videosPixverse = VideosPixverseApi(client: httpClient)
        self.videosRunway = VideosRunwayApi(client: httpClient)
        self.imagesRunway = ImagesRunwayApi(client: httpClient)
        self.audioStabilityAi = AudioStabilityAiApi(client: httpClient)
        self.imagesStabilityAi = ImagesStabilityAiApi(client: httpClient)
        self.musicSuno = MusicSunoApi(client: httpClient)
        self.chatTypesafe = ChatTypesafeApi(client: httpClient)
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
        self.tool = ToolApi(client: httpClient)
        self.uploads = UploadsApi(client: httpClient)
        self.vectorStores = VectorStoresApi(client: httpClient)
        self.video = VideoApi(client: httpClient)
        self.videosVidu = VideosViduApi(client: httpClient)
        self.imagesVidu = ImagesViduApi(client: httpClient)
        self.audioVidu = AudioViduApi(client: httpClient)
        self.audioVolcengine = AudioVolcengineApi(client: httpClient)
        self.videosVolcengine = VideosVolcengineApi(client: httpClient)
        self.imagesVolcengine = ImagesVolcengineApi(client: httpClient)
        self.imagesXai = ImagesXaiApi(client: httpClient)
        self.videosXai = VideosXaiApi(client: httpClient)
        self.videosZhipu = VideosZhipuApi(client: httpClient)
        self.imagesZhipu = ImagesZhipuApi(client: httpClient)
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
