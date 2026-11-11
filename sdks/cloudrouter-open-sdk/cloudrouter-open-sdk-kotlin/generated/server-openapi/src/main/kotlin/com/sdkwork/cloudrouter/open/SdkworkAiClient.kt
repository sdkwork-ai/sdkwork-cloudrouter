package com.sdkwork.cloudrouter.open

import com.sdkwork.common.core.SdkConfig
import com.sdkwork.cloudrouter.open.http.HttpClient
import com.sdkwork.cloudrouter.open.api.ImagesAlibabaApi
import com.sdkwork.cloudrouter.open.api.VideosAlibabaApi
import com.sdkwork.cloudrouter.open.api.AudioAlibabaApi
import com.sdkwork.cloudrouter.open.api.FilesAnthropicApi
import com.sdkwork.cloudrouter.open.api.ChatAnthropicApi
import com.sdkwork.cloudrouter.open.api.BatchesAnthropicApi
import com.sdkwork.cloudrouter.open.api.VideosBlackForestLabsApi
import com.sdkwork.cloudrouter.open.api.ImagesBlackForestLabsApi
import com.sdkwork.cloudrouter.open.api.VideosBytedanceApi
import com.sdkwork.cloudrouter.open.api.ImagesBytedanceApi
import com.sdkwork.cloudrouter.open.api.AudioBytedanceApi
import com.sdkwork.cloudrouter.open.api.MusicElevenlabsApi
import com.sdkwork.cloudrouter.open.api.AudioElevenlabsApi
import com.sdkwork.cloudrouter.open.api.ResponsesGoogleApi
import com.sdkwork.cloudrouter.open.api.FilesGoogleApi
import com.sdkwork.cloudrouter.open.api.VideosGoogleApi
import com.sdkwork.cloudrouter.open.api.EmbeddingsGoogleApi
import com.sdkwork.cloudrouter.open.api.ChatGoogleApi
import com.sdkwork.cloudrouter.open.api.ImagesGoogleApi
import com.sdkwork.cloudrouter.open.api.VideosJimengApi
import com.sdkwork.cloudrouter.open.api.AudioKlingApi
import com.sdkwork.cloudrouter.open.api.ImagesKlingApi
import com.sdkwork.cloudrouter.open.api.VideosKlingApi
import com.sdkwork.cloudrouter.open.api.VideosLumaAiApi
import com.sdkwork.cloudrouter.open.api.VideosMinimaxApi
import com.sdkwork.cloudrouter.open.api.ImagesMinimaxApi
import com.sdkwork.cloudrouter.open.api.MusicMinimaxApi
import com.sdkwork.cloudrouter.open.api.AudioMinimaxApi
import com.sdkwork.cloudrouter.open.api.MusicMurekaApi
import com.sdkwork.cloudrouter.open.api.VideosPixverseApi
import com.sdkwork.cloudrouter.open.api.VideosRunwayApi
import com.sdkwork.cloudrouter.open.api.ImagesRunwayApi
import com.sdkwork.cloudrouter.open.api.AudioStabilityAiApi
import com.sdkwork.cloudrouter.open.api.ImagesStabilityAiApi
import com.sdkwork.cloudrouter.open.api.MusicSunoApi
import com.sdkwork.cloudrouter.open.api.ChatTypesafeApi
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
import com.sdkwork.cloudrouter.open.api.ToolApi
import com.sdkwork.cloudrouter.open.api.UploadsApi
import com.sdkwork.cloudrouter.open.api.VectorStoresApi
import com.sdkwork.cloudrouter.open.api.VideoApi
import com.sdkwork.cloudrouter.open.api.VideosViduApi
import com.sdkwork.cloudrouter.open.api.ImagesViduApi
import com.sdkwork.cloudrouter.open.api.AudioViduApi
import com.sdkwork.cloudrouter.open.api.AudioVolcengineApi
import com.sdkwork.cloudrouter.open.api.VideosVolcengineApi
import com.sdkwork.cloudrouter.open.api.ImagesVolcengineApi
import com.sdkwork.cloudrouter.open.api.ImagesXaiApi
import com.sdkwork.cloudrouter.open.api.VideosXaiApi
import com.sdkwork.cloudrouter.open.api.VideosZhipuApi
import com.sdkwork.cloudrouter.open.api.ImagesZhipuApi

open class SdkworkAiClient {
    private val httpClient: HttpClient

    lateinit var imagesAlibaba: ImagesAlibabaApi
    lateinit var videosAlibaba: VideosAlibabaApi
    lateinit var audioAlibaba: AudioAlibabaApi
    lateinit var filesAnthropic: FilesAnthropicApi
    lateinit var chatAnthropic: ChatAnthropicApi
    lateinit var batchesAnthropic: BatchesAnthropicApi
    lateinit var videosBlackForestLabs: VideosBlackForestLabsApi
    lateinit var imagesBlackForestLabs: ImagesBlackForestLabsApi
    lateinit var videosBytedance: VideosBytedanceApi
    lateinit var imagesBytedance: ImagesBytedanceApi
    lateinit var audioBytedance: AudioBytedanceApi
    lateinit var musicElevenlabs: MusicElevenlabsApi
    lateinit var audioElevenlabs: AudioElevenlabsApi
    lateinit var responsesGoogle: ResponsesGoogleApi
    lateinit var filesGoogle: FilesGoogleApi
    lateinit var videosGoogle: VideosGoogleApi
    lateinit var embeddingsGoogle: EmbeddingsGoogleApi
    lateinit var chatGoogle: ChatGoogleApi
    lateinit var imagesGoogle: ImagesGoogleApi
    lateinit var videosJimeng: VideosJimengApi
    lateinit var audioKling: AudioKlingApi
    lateinit var imagesKling: ImagesKlingApi
    lateinit var videosKling: VideosKlingApi
    lateinit var videosLumaAi: VideosLumaAiApi
    lateinit var videosMinimax: VideosMinimaxApi
    lateinit var imagesMinimax: ImagesMinimaxApi
    lateinit var musicMinimax: MusicMinimaxApi
    lateinit var audioMinimax: AudioMinimaxApi
    lateinit var musicMureka: MusicMurekaApi
    lateinit var videosPixverse: VideosPixverseApi
    lateinit var videosRunway: VideosRunwayApi
    lateinit var imagesRunway: ImagesRunwayApi
    lateinit var audioStabilityAi: AudioStabilityAiApi
    lateinit var imagesStabilityAi: ImagesStabilityAiApi
    lateinit var musicSuno: MusicSunoApi
    lateinit var chatTypesafe: ChatTypesafeApi
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
    lateinit var tool: ToolApi
    lateinit var uploads: UploadsApi
    lateinit var vectorStores: VectorStoresApi
    lateinit var video: VideoApi
    lateinit var videosVidu: VideosViduApi
    lateinit var imagesVidu: ImagesViduApi
    lateinit var audioVidu: AudioViduApi
    lateinit var audioVolcengine: AudioVolcengineApi
    lateinit var videosVolcengine: VideosVolcengineApi
    lateinit var imagesVolcengine: ImagesVolcengineApi
    lateinit var imagesXai: ImagesXaiApi
    lateinit var videosXai: VideosXaiApi
    lateinit var videosZhipu: VideosZhipuApi
    lateinit var imagesZhipu: ImagesZhipuApi

    constructor(baseUrl: String) {
        this.httpClient = HttpClient(baseUrl)
        imagesAlibaba = ImagesAlibabaApi(httpClient)
        videosAlibaba = VideosAlibabaApi(httpClient)
        audioAlibaba = AudioAlibabaApi(httpClient)
        filesAnthropic = FilesAnthropicApi(httpClient)
        chatAnthropic = ChatAnthropicApi(httpClient)
        batchesAnthropic = BatchesAnthropicApi(httpClient)
        videosBlackForestLabs = VideosBlackForestLabsApi(httpClient)
        imagesBlackForestLabs = ImagesBlackForestLabsApi(httpClient)
        videosBytedance = VideosBytedanceApi(httpClient)
        imagesBytedance = ImagesBytedanceApi(httpClient)
        audioBytedance = AudioBytedanceApi(httpClient)
        musicElevenlabs = MusicElevenlabsApi(httpClient)
        audioElevenlabs = AudioElevenlabsApi(httpClient)
        responsesGoogle = ResponsesGoogleApi(httpClient)
        filesGoogle = FilesGoogleApi(httpClient)
        videosGoogle = VideosGoogleApi(httpClient)
        embeddingsGoogle = EmbeddingsGoogleApi(httpClient)
        chatGoogle = ChatGoogleApi(httpClient)
        imagesGoogle = ImagesGoogleApi(httpClient)
        videosJimeng = VideosJimengApi(httpClient)
        audioKling = AudioKlingApi(httpClient)
        imagesKling = ImagesKlingApi(httpClient)
        videosKling = VideosKlingApi(httpClient)
        videosLumaAi = VideosLumaAiApi(httpClient)
        videosMinimax = VideosMinimaxApi(httpClient)
        imagesMinimax = ImagesMinimaxApi(httpClient)
        musicMinimax = MusicMinimaxApi(httpClient)
        audioMinimax = AudioMinimaxApi(httpClient)
        musicMureka = MusicMurekaApi(httpClient)
        videosPixverse = VideosPixverseApi(httpClient)
        videosRunway = VideosRunwayApi(httpClient)
        imagesRunway = ImagesRunwayApi(httpClient)
        audioStabilityAi = AudioStabilityAiApi(httpClient)
        imagesStabilityAi = ImagesStabilityAiApi(httpClient)
        musicSuno = MusicSunoApi(httpClient)
        chatTypesafe = ChatTypesafeApi(httpClient)
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
        tool = ToolApi(httpClient)
        uploads = UploadsApi(httpClient)
        vectorStores = VectorStoresApi(httpClient)
        video = VideoApi(httpClient)
        videosVidu = VideosViduApi(httpClient)
        imagesVidu = ImagesViduApi(httpClient)
        audioVidu = AudioViduApi(httpClient)
        audioVolcengine = AudioVolcengineApi(httpClient)
        videosVolcengine = VideosVolcengineApi(httpClient)
        imagesVolcengine = ImagesVolcengineApi(httpClient)
        imagesXai = ImagesXaiApi(httpClient)
        videosXai = VideosXaiApi(httpClient)
        videosZhipu = VideosZhipuApi(httpClient)
        imagesZhipu = ImagesZhipuApi(httpClient)
    }

    constructor(config: SdkConfig) {
        this.httpClient = HttpClient(config)
        imagesAlibaba = ImagesAlibabaApi(httpClient)
        videosAlibaba = VideosAlibabaApi(httpClient)
        audioAlibaba = AudioAlibabaApi(httpClient)
        filesAnthropic = FilesAnthropicApi(httpClient)
        chatAnthropic = ChatAnthropicApi(httpClient)
        batchesAnthropic = BatchesAnthropicApi(httpClient)
        videosBlackForestLabs = VideosBlackForestLabsApi(httpClient)
        imagesBlackForestLabs = ImagesBlackForestLabsApi(httpClient)
        videosBytedance = VideosBytedanceApi(httpClient)
        imagesBytedance = ImagesBytedanceApi(httpClient)
        audioBytedance = AudioBytedanceApi(httpClient)
        musicElevenlabs = MusicElevenlabsApi(httpClient)
        audioElevenlabs = AudioElevenlabsApi(httpClient)
        responsesGoogle = ResponsesGoogleApi(httpClient)
        filesGoogle = FilesGoogleApi(httpClient)
        videosGoogle = VideosGoogleApi(httpClient)
        embeddingsGoogle = EmbeddingsGoogleApi(httpClient)
        chatGoogle = ChatGoogleApi(httpClient)
        imagesGoogle = ImagesGoogleApi(httpClient)
        videosJimeng = VideosJimengApi(httpClient)
        audioKling = AudioKlingApi(httpClient)
        imagesKling = ImagesKlingApi(httpClient)
        videosKling = VideosKlingApi(httpClient)
        videosLumaAi = VideosLumaAiApi(httpClient)
        videosMinimax = VideosMinimaxApi(httpClient)
        imagesMinimax = ImagesMinimaxApi(httpClient)
        musicMinimax = MusicMinimaxApi(httpClient)
        audioMinimax = AudioMinimaxApi(httpClient)
        musicMureka = MusicMurekaApi(httpClient)
        videosPixverse = VideosPixverseApi(httpClient)
        videosRunway = VideosRunwayApi(httpClient)
        imagesRunway = ImagesRunwayApi(httpClient)
        audioStabilityAi = AudioStabilityAiApi(httpClient)
        imagesStabilityAi = ImagesStabilityAiApi(httpClient)
        musicSuno = MusicSunoApi(httpClient)
        chatTypesafe = ChatTypesafeApi(httpClient)
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
        tool = ToolApi(httpClient)
        uploads = UploadsApi(httpClient)
        vectorStores = VectorStoresApi(httpClient)
        video = VideoApi(httpClient)
        videosVidu = VideosViduApi(httpClient)
        imagesVidu = ImagesViduApi(httpClient)
        audioVidu = AudioViduApi(httpClient)
        audioVolcengine = AudioVolcengineApi(httpClient)
        videosVolcengine = VideosVolcengineApi(httpClient)
        imagesVolcengine = ImagesVolcengineApi(httpClient)
        imagesXai = ImagesXaiApi(httpClient)
        videosXai = VideosXaiApi(httpClient)
        videosZhipu = VideosZhipuApi(httpClient)
        imagesZhipu = ImagesZhipuApi(httpClient)
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
