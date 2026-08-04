package com.sdkwork.cloudrouter.open

import com.sdkwork.common.core.SdkConfig
import com.sdkwork.cloudrouter.open.http.HttpClient
import com.sdkwork.cloudrouter.open.api.FilesAnthropicApi
import com.sdkwork.cloudrouter.open.api.ChatAnthropicApi
import com.sdkwork.cloudrouter.open.api.BatchesAnthropicApi
import com.sdkwork.cloudrouter.open.api.ResponsesGoogleApi
import com.sdkwork.cloudrouter.open.api.FilesGoogleApi
import com.sdkwork.cloudrouter.open.api.EmbeddingsGoogleApi
import com.sdkwork.cloudrouter.open.api.ChatGoogleApi
import com.sdkwork.cloudrouter.open.api.VideosKlingApi
import com.sdkwork.cloudrouter.open.api.ImagesMidjourneyApi
import com.sdkwork.cloudrouter.open.api.ImagesNanoBananaApi
import com.sdkwork.cloudrouter.open.api.AudioSunoApi
import com.sdkwork.cloudrouter.open.api.AssistantsApi
import com.sdkwork.cloudrouter.open.api.AudioApi
import com.sdkwork.cloudrouter.open.api.BatchesApi
import com.sdkwork.cloudrouter.open.api.ChatApi
import com.sdkwork.cloudrouter.open.api.CompletionApi
import com.sdkwork.cloudrouter.open.api.ContainerApi
import com.sdkwork.cloudrouter.open.api.ConversationApi
import com.sdkwork.cloudrouter.open.api.EmbeddingsApi
import com.sdkwork.cloudrouter.open.api.FilesApi
import com.sdkwork.cloudrouter.open.api.ImagesApi
import com.sdkwork.cloudrouter.open.api.ModelsApi
import com.sdkwork.cloudrouter.open.api.ModerationsApi
import com.sdkwork.cloudrouter.open.api.RealtimeApi
import com.sdkwork.cloudrouter.open.api.ResponsesApi
import com.sdkwork.cloudrouter.open.api.ThreadsApi
import com.sdkwork.cloudrouter.open.api.UploadsApi
import com.sdkwork.cloudrouter.open.api.VectorStoresApi
import com.sdkwork.cloudrouter.open.api.VideoApi
import com.sdkwork.cloudrouter.open.api.VideosViduApi
import com.sdkwork.cloudrouter.open.api.ImagesViduApi
import com.sdkwork.cloudrouter.open.api.VideosVolcengineApi

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
