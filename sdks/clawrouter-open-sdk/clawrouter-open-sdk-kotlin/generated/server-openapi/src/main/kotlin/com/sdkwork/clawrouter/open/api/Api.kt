package com.sdkwork.clawrouter.open.api

import com.sdkwork.clawrouter.open.http.HttpClient

/**
 * API modules for clawrouter-open-sdk
 */
class Api(private val client: HttpClient) {
    val filesAnthropic: FilesAnthropicApi = FilesAnthropicApi(client)
    val chatAnthropic: ChatAnthropicApi = ChatAnthropicApi(client)
    val batchesAnthropic: BatchesAnthropicApi = BatchesAnthropicApi(client)
    val responsesGoogle: ResponsesGoogleApi = ResponsesGoogleApi(client)
    val filesGoogle: FilesGoogleApi = FilesGoogleApi(client)
    val embeddingsGoogle: EmbeddingsGoogleApi = EmbeddingsGoogleApi(client)
    val chatGoogle: ChatGoogleApi = ChatGoogleApi(client)
    val videosKling: VideosKlingApi = VideosKlingApi(client)
    val imagesMidjourney: ImagesMidjourneyApi = ImagesMidjourneyApi(client)
    val imagesNanoBanana: ImagesNanoBananaApi = ImagesNanoBananaApi(client)
    val audioSuno: AudioSunoApi = AudioSunoApi(client)
    val assistants: AssistantsApi = AssistantsApi(client)
    val audio: AudioApi = AudioApi(client)
    val batches: BatchesApi = BatchesApi(client)
    val chat: ChatApi = ChatApi(client)
    val completion: CompletionApi = CompletionApi(client)
    val container: ContainerApi = ContainerApi(client)
    val conversation: ConversationApi = ConversationApi(client)
    val embeddings: EmbeddingsApi = EmbeddingsApi(client)
    val files: FilesApi = FilesApi(client)
    val images: ImagesApi = ImagesApi(client)
    val models: ModelsApi = ModelsApi(client)
    val moderations: ModerationsApi = ModerationsApi(client)
    val realtime: RealtimeApi = RealtimeApi(client)
    val responses: ResponsesApi = ResponsesApi(client)
    val threads: ThreadsApi = ThreadsApi(client)
    val uploads: UploadsApi = UploadsApi(client)
    val vectorStores: VectorStoresApi = VectorStoresApi(client)
    val video: VideoApi = VideoApi(client)
    val videosVidu: VideosViduApi = VideosViduApi(client)
    val imagesVidu: ImagesViduApi = ImagesViduApi(client)
    val videosVolcengine: VideosVolcengineApi = VideosVolcengineApi(client)
}
