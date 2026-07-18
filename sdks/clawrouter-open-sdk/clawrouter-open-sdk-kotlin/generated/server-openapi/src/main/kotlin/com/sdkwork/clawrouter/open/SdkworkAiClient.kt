package com.sdkwork.clawrouter.open

import com.sdkwork.common.core.SdkConfig
import com.sdkwork.clawrouter.open.http.HttpClient
import com.sdkwork.clawrouter.open.api.FilesAnthropicApi
import com.sdkwork.clawrouter.open.api.ChatAnthropicApi
import com.sdkwork.clawrouter.open.api.BatchesAnthropicApi
import com.sdkwork.clawrouter.open.api.ResponsesGoogleApi
import com.sdkwork.clawrouter.open.api.FilesGoogleApi
import com.sdkwork.clawrouter.open.api.EmbeddingsGoogleApi
import com.sdkwork.clawrouter.open.api.ChatGoogleApi
import com.sdkwork.clawrouter.open.api.VideosKlingApi
import com.sdkwork.clawrouter.open.api.ImagesMidjourneyApi
import com.sdkwork.clawrouter.open.api.ImagesNanoBananaApi
import com.sdkwork.clawrouter.open.api.AudioSunoApi
import com.sdkwork.clawrouter.open.api.AssistantsApi
import com.sdkwork.clawrouter.open.api.AudioApi
import com.sdkwork.clawrouter.open.api.BatchesApi
import com.sdkwork.clawrouter.open.api.ChatApi
import com.sdkwork.clawrouter.open.api.CompletionApi
import com.sdkwork.clawrouter.open.api.ContainerApi
import com.sdkwork.clawrouter.open.api.ConversationApi
import com.sdkwork.clawrouter.open.api.EmbeddingsApi
import com.sdkwork.clawrouter.open.api.FilesApi
import com.sdkwork.clawrouter.open.api.ImagesApi
import com.sdkwork.clawrouter.open.api.ModelsApi
import com.sdkwork.clawrouter.open.api.ModerationsApi
import com.sdkwork.clawrouter.open.api.RealtimeApi
import com.sdkwork.clawrouter.open.api.ResponsesApi
import com.sdkwork.clawrouter.open.api.ThreadsApi
import com.sdkwork.clawrouter.open.api.UploadsApi
import com.sdkwork.clawrouter.open.api.VectorStoresApi
import com.sdkwork.clawrouter.open.api.VideoApi
import com.sdkwork.clawrouter.open.api.VideosViduApi
import com.sdkwork.clawrouter.open.api.ImagesViduApi
import com.sdkwork.clawrouter.open.api.VideosVolcengineApi

open class SdkworkAiClient {
    private val httpClient: HttpClient

    lateinit var filesAnthropic: FilesAnthropicApi
    lateinit var chatAnthropic: ChatAnthropicApi
    lateinit var batchesAnthropic: BatchesAnthropicApi
    lateinit var responsesGoogle: ResponsesGoogleApi
    lateinit var filesGoogle: FilesGoogleApi
    lateinit var embeddingsGoogle: EmbeddingsGoogleApi
    lateinit var chatGoogle: ChatGoogleApi
    lateinit var videosKling: VideosKlingApi
    lateinit var imagesMidjourney: ImagesMidjourneyApi
    lateinit var imagesNanoBanana: ImagesNanoBananaApi
    lateinit var audioSuno: AudioSunoApi
    lateinit var assistants: AssistantsApi
    lateinit var audio: AudioApi
    lateinit var batches: BatchesApi
    lateinit var chat: ChatApi
    lateinit var completion: CompletionApi
    lateinit var container: ContainerApi
    lateinit var conversation: ConversationApi
    lateinit var embeddings: EmbeddingsApi
    lateinit var files: FilesApi
    lateinit var images: ImagesApi
    lateinit var models: ModelsApi
    lateinit var moderations: ModerationsApi
    lateinit var realtime: RealtimeApi
    lateinit var responses: ResponsesApi
    lateinit var threads: ThreadsApi
    lateinit var uploads: UploadsApi
    lateinit var vectorStores: VectorStoresApi
    lateinit var video: VideoApi
    lateinit var videosVidu: VideosViduApi
    lateinit var imagesVidu: ImagesViduApi
    lateinit var videosVolcengine: VideosVolcengineApi

    constructor(baseUrl: String) {
        this.httpClient = HttpClient(baseUrl)
        filesAnthropic = FilesAnthropicApi(httpClient)
        chatAnthropic = ChatAnthropicApi(httpClient)
        batchesAnthropic = BatchesAnthropicApi(httpClient)
        responsesGoogle = ResponsesGoogleApi(httpClient)
        filesGoogle = FilesGoogleApi(httpClient)
        embeddingsGoogle = EmbeddingsGoogleApi(httpClient)
        chatGoogle = ChatGoogleApi(httpClient)
        videosKling = VideosKlingApi(httpClient)
        imagesMidjourney = ImagesMidjourneyApi(httpClient)
        imagesNanoBanana = ImagesNanoBananaApi(httpClient)
        audioSuno = AudioSunoApi(httpClient)
        assistants = AssistantsApi(httpClient)
        audio = AudioApi(httpClient)
        batches = BatchesApi(httpClient)
        chat = ChatApi(httpClient)
        completion = CompletionApi(httpClient)
        container = ContainerApi(httpClient)
        conversation = ConversationApi(httpClient)
        embeddings = EmbeddingsApi(httpClient)
        files = FilesApi(httpClient)
        images = ImagesApi(httpClient)
        models = ModelsApi(httpClient)
        moderations = ModerationsApi(httpClient)
        realtime = RealtimeApi(httpClient)
        responses = ResponsesApi(httpClient)
        threads = ThreadsApi(httpClient)
        uploads = UploadsApi(httpClient)
        vectorStores = VectorStoresApi(httpClient)
        video = VideoApi(httpClient)
        videosVidu = VideosViduApi(httpClient)
        imagesVidu = ImagesViduApi(httpClient)
        videosVolcengine = VideosVolcengineApi(httpClient)
    }

    constructor(config: SdkConfig) {
        this.httpClient = HttpClient(config)
        filesAnthropic = FilesAnthropicApi(httpClient)
        chatAnthropic = ChatAnthropicApi(httpClient)
        batchesAnthropic = BatchesAnthropicApi(httpClient)
        responsesGoogle = ResponsesGoogleApi(httpClient)
        filesGoogle = FilesGoogleApi(httpClient)
        embeddingsGoogle = EmbeddingsGoogleApi(httpClient)
        chatGoogle = ChatGoogleApi(httpClient)
        videosKling = VideosKlingApi(httpClient)
        imagesMidjourney = ImagesMidjourneyApi(httpClient)
        imagesNanoBanana = ImagesNanoBananaApi(httpClient)
        audioSuno = AudioSunoApi(httpClient)
        assistants = AssistantsApi(httpClient)
        audio = AudioApi(httpClient)
        batches = BatchesApi(httpClient)
        chat = ChatApi(httpClient)
        completion = CompletionApi(httpClient)
        container = ContainerApi(httpClient)
        conversation = ConversationApi(httpClient)
        embeddings = EmbeddingsApi(httpClient)
        files = FilesApi(httpClient)
        images = ImagesApi(httpClient)
        models = ModelsApi(httpClient)
        moderations = ModerationsApi(httpClient)
        realtime = RealtimeApi(httpClient)
        responses = ResponsesApi(httpClient)
        threads = ThreadsApi(httpClient)
        uploads = UploadsApi(httpClient)
        vectorStores = VectorStoresApi(httpClient)
        video = VideoApi(httpClient)
        videosVidu = VideosViduApi(httpClient)
        imagesVidu = ImagesViduApi(httpClient)
        videosVolcengine = VideosVolcengineApi(httpClient)
    }

    fun setApiKey(apiKey: String): SdkworkAiClient {
        httpClient.setApiKey(apiKey)
        return this
    }

    fun setAuthToken(token: String): SdkworkAiClient {
        httpClient.setAuthToken(token)
        return this
    }

    fun setAccessToken(token: String): SdkworkAiClient {
        httpClient.setAccessToken(token)
        return this
    }

    fun setHeader(key: String, value: String): SdkworkAiClient {
        httpClient.setHeader(key, value)
        return this
    }
}
