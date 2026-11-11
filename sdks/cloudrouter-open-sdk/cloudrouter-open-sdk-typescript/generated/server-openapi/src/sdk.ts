import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkAiConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { ImagesAlibabaApi, createImagesAlibabaApi } from './api/images-alibaba';
import { VideosAlibabaApi, createVideosAlibabaApi } from './api/videos-alibaba';
import { AudioAlibabaApi, createAudioAlibabaApi } from './api/audio-alibaba';
import { FilesAnthropicApi, createFilesAnthropicApi } from './api/files-anthropic';
import { ChatAnthropicApi, createChatAnthropicApi } from './api/chat-anthropic';
import { BatchesAnthropicApi, createBatchesAnthropicApi } from './api/batches-anthropic';
import { VideosBlackForestLabsApi, createVideosBlackForestLabsApi } from './api/videos-black-forest-labs';
import { ImagesBlackForestLabsApi, createImagesBlackForestLabsApi } from './api/images-black-forest-labs';
import { VideosBytedanceApi, createVideosBytedanceApi } from './api/videos-bytedance';
import { ImagesBytedanceApi, createImagesBytedanceApi } from './api/images-bytedance';
import { AudioBytedanceApi, createAudioBytedanceApi } from './api/audio-bytedance';
import { MusicElevenlabsApi, createMusicElevenlabsApi } from './api/music-elevenlabs';
import { AudioElevenlabsApi, createAudioElevenlabsApi } from './api/audio-elevenlabs';
import { ResponsesGoogleApi, createResponsesGoogleApi } from './api/responses-google';
import { FilesGoogleApi, createFilesGoogleApi } from './api/files-google';
import { VideosGoogleApi, createVideosGoogleApi } from './api/videos-google';
import { EmbeddingsGoogleApi, createEmbeddingsGoogleApi } from './api/embeddings-google';
import { ChatGoogleApi, createChatGoogleApi } from './api/chat-google';
import { ImagesGoogleApi, createImagesGoogleApi } from './api/images-google';
import { VideosJimengApi, createVideosJimengApi } from './api/videos-jimeng';
import { AudioKlingApi, createAudioKlingApi } from './api/audio-kling';
import { ImagesKlingApi, createImagesKlingApi } from './api/images-kling';
import { VideosKlingApi, createVideosKlingApi } from './api/videos-kling';
import { VideosLumaAiApi, createVideosLumaAiApi } from './api/videos-luma-ai';
import { VideosMinimaxApi, createVideosMinimaxApi } from './api/videos-minimax';
import { ImagesMinimaxApi, createImagesMinimaxApi } from './api/images-minimax';
import { MusicMinimaxApi, createMusicMinimaxApi } from './api/music-minimax';
import { AudioMinimaxApi, createAudioMinimaxApi } from './api/audio-minimax';
import { MusicMurekaApi, createMusicMurekaApi } from './api/music-mureka';
import { VideosPixverseApi, createVideosPixverseApi } from './api/videos-pixverse';
import { VideosRunwayApi, createVideosRunwayApi } from './api/videos-runway';
import { ImagesRunwayApi, createImagesRunwayApi } from './api/images-runway';
import { AudioStabilityAiApi, createAudioStabilityAiApi } from './api/audio-stability-ai';
import { ImagesStabilityAiApi, createImagesStabilityAiApi } from './api/images-stability-ai';
import { MusicSunoApi, createMusicSunoApi } from './api/music-suno';
import { ChatTypesafeApi, createChatTypesafeApi } from './api/chat-typesafe';
import { AssistantsApi, createAssistantsApi } from './api/assistants';
import { AudioApi, createAudioApi } from './api/audio';
import { BatchesApi, createBatchesApi } from './api/batches';
import { ChatApi, createChatApi } from './api/chat';
import { CompletionApi, createCompletionApi } from './api/completion';
import { ContainerApi, createContainerApi } from './api/container';
import { ConversationApi, createConversationApi } from './api/conversation';
import { EmbeddingsApi, createEmbeddingsApi } from './api/embeddings';
import { FilesApi, createFilesApi } from './api/files';
import { ImagesApi, createImagesApi } from './api/images';
import { ModelsApi, createModelsApi } from './api/models';
import { ModerationsApi, createModerationsApi } from './api/moderations';
import { RealtimeApi, createRealtimeApi } from './api/realtime';
import { ResponsesApi, createResponsesApi } from './api/responses';
import { ThreadsApi, createThreadsApi } from './api/threads';
import { ToolApi, createToolApi } from './api/tool';
import { UploadsApi, createUploadsApi } from './api/uploads';
import { VectorStoresApi, createVectorStoresApi } from './api/vector-stores';
import { VideoApi, createVideoApi } from './api/video';
import { VideosViduApi, createVideosViduApi } from './api/videos-vidu';
import { ImagesViduApi, createImagesViduApi } from './api/images-vidu';
import { AudioViduApi, createAudioViduApi } from './api/audio-vidu';
import { AudioVolcengineApi, createAudioVolcengineApi } from './api/audio-volcengine';
import { VideosVolcengineApi, createVideosVolcengineApi } from './api/videos-volcengine';
import { ImagesVolcengineApi, createImagesVolcengineApi } from './api/images-volcengine';
import { ImagesXaiApi, createImagesXaiApi } from './api/images-xai';
import { VideosXaiApi, createVideosXaiApi } from './api/videos-xai';
import { VideosZhipuApi, createVideosZhipuApi } from './api/videos-zhipu';
import { ImagesZhipuApi, createImagesZhipuApi } from './api/images-zhipu';

export class SdkworkAiClient {
  private httpClient: HttpClient;

  public readonly imagesAlibaba: ImagesAlibabaApi;
  public readonly videosAlibaba: VideosAlibabaApi;
  public readonly audioAlibaba: AudioAlibabaApi;
  public readonly filesAnthropic: FilesAnthropicApi;
  public readonly chatAnthropic: ChatAnthropicApi;
  public readonly batchesAnthropic: BatchesAnthropicApi;
  public readonly videosBlackForestLabs: VideosBlackForestLabsApi;
  public readonly imagesBlackForestLabs: ImagesBlackForestLabsApi;
  public readonly videosBytedance: VideosBytedanceApi;
  public readonly imagesBytedance: ImagesBytedanceApi;
  public readonly audioBytedance: AudioBytedanceApi;
  public readonly musicElevenlabs: MusicElevenlabsApi;
  public readonly audioElevenlabs: AudioElevenlabsApi;
  public readonly responsesGoogle: ResponsesGoogleApi;
  public readonly filesGoogle: FilesGoogleApi;
  public readonly videosGoogle: VideosGoogleApi;
  public readonly embeddingsGoogle: EmbeddingsGoogleApi;
  public readonly chatGoogle: ChatGoogleApi;
  public readonly imagesGoogle: ImagesGoogleApi;
  public readonly videosJimeng: VideosJimengApi;
  public readonly audioKling: AudioKlingApi;
  public readonly imagesKling: ImagesKlingApi;
  public readonly videosKling: VideosKlingApi;
  public readonly videosLumaAi: VideosLumaAiApi;
  public readonly videosMinimax: VideosMinimaxApi;
  public readonly imagesMinimax: ImagesMinimaxApi;
  public readonly musicMinimax: MusicMinimaxApi;
  public readonly audioMinimax: AudioMinimaxApi;
  public readonly musicMureka: MusicMurekaApi;
  public readonly videosPixverse: VideosPixverseApi;
  public readonly videosRunway: VideosRunwayApi;
  public readonly imagesRunway: ImagesRunwayApi;
  public readonly audioStabilityAi: AudioStabilityAiApi;
  public readonly imagesStabilityAi: ImagesStabilityAiApi;
  public readonly musicSuno: MusicSunoApi;
  public readonly chatTypesafe: ChatTypesafeApi;
  public readonly assistants: AssistantsApi;
  public readonly audio: AudioApi;
  public readonly batches: BatchesApi;
  public readonly chat: ChatApi;
  public readonly completion: CompletionApi;
  public readonly container: ContainerApi;
  public readonly conversation: ConversationApi;
  public readonly embeddings: EmbeddingsApi;
  public readonly files: FilesApi;
  public readonly images: ImagesApi;
  public readonly models: ModelsApi;
  public readonly moderations: ModerationsApi;
  public readonly realtime: RealtimeApi;
  public readonly responses: ResponsesApi;
  public readonly threads: ThreadsApi;
  public readonly tool: ToolApi;
  public readonly uploads: UploadsApi;
  public readonly vectorStores: VectorStoresApi;
  public readonly video: VideoApi;
  public readonly videosVidu: VideosViduApi;
  public readonly imagesVidu: ImagesViduApi;
  public readonly audioVidu: AudioViduApi;
  public readonly audioVolcengine: AudioVolcengineApi;
  public readonly videosVolcengine: VideosVolcengineApi;
  public readonly imagesVolcengine: ImagesVolcengineApi;
  public readonly imagesXai: ImagesXaiApi;
  public readonly videosXai: VideosXaiApi;
  public readonly videosZhipu: VideosZhipuApi;
  public readonly imagesZhipu: ImagesZhipuApi;

  constructor(config: SdkworkAiConfig) {
    this.httpClient = createHttpClient(config);
    this.imagesAlibaba = createImagesAlibabaApi(this.httpClient);

    this.videosAlibaba = createVideosAlibabaApi(this.httpClient);

    this.audioAlibaba = createAudioAlibabaApi(this.httpClient);

    this.filesAnthropic = createFilesAnthropicApi(this.httpClient);

    this.chatAnthropic = createChatAnthropicApi(this.httpClient);

    this.batchesAnthropic = createBatchesAnthropicApi(this.httpClient);

    this.videosBlackForestLabs = createVideosBlackForestLabsApi(this.httpClient);

    this.imagesBlackForestLabs = createImagesBlackForestLabsApi(this.httpClient);

    this.videosBytedance = createVideosBytedanceApi(this.httpClient);

    this.imagesBytedance = createImagesBytedanceApi(this.httpClient);

    this.audioBytedance = createAudioBytedanceApi(this.httpClient);

    this.musicElevenlabs = createMusicElevenlabsApi(this.httpClient);

    this.audioElevenlabs = createAudioElevenlabsApi(this.httpClient);

    this.responsesGoogle = createResponsesGoogleApi(this.httpClient);

    this.filesGoogle = createFilesGoogleApi(this.httpClient);

    this.videosGoogle = createVideosGoogleApi(this.httpClient);

    this.embeddingsGoogle = createEmbeddingsGoogleApi(this.httpClient);

    this.chatGoogle = createChatGoogleApi(this.httpClient);

    this.imagesGoogle = createImagesGoogleApi(this.httpClient);

    this.videosJimeng = createVideosJimengApi(this.httpClient);

    this.audioKling = createAudioKlingApi(this.httpClient);

    this.imagesKling = createImagesKlingApi(this.httpClient);

    this.videosKling = createVideosKlingApi(this.httpClient);

    this.videosLumaAi = createVideosLumaAiApi(this.httpClient);

    this.videosMinimax = createVideosMinimaxApi(this.httpClient);

    this.imagesMinimax = createImagesMinimaxApi(this.httpClient);

    this.musicMinimax = createMusicMinimaxApi(this.httpClient);

    this.audioMinimax = createAudioMinimaxApi(this.httpClient);

    this.musicMureka = createMusicMurekaApi(this.httpClient);

    this.videosPixverse = createVideosPixverseApi(this.httpClient);

    this.videosRunway = createVideosRunwayApi(this.httpClient);

    this.imagesRunway = createImagesRunwayApi(this.httpClient);

    this.audioStabilityAi = createAudioStabilityAiApi(this.httpClient);

    this.imagesStabilityAi = createImagesStabilityAiApi(this.httpClient);

    this.musicSuno = createMusicSunoApi(this.httpClient);

    this.chatTypesafe = createChatTypesafeApi(this.httpClient);

    this.assistants = createAssistantsApi(this.httpClient);

    this.audio = createAudioApi(this.httpClient);

    this.batches = createBatchesApi(this.httpClient);

    this.chat = createChatApi(this.httpClient);

    this.completion = createCompletionApi(this.httpClient);

    this.container = createContainerApi(this.httpClient);

    this.conversation = createConversationApi(this.httpClient);

    this.embeddings = createEmbeddingsApi(this.httpClient);

    this.files = createFilesApi(this.httpClient);

    this.images = createImagesApi(this.httpClient);

    this.models = createModelsApi(this.httpClient);

    this.moderations = createModerationsApi(this.httpClient);

    this.realtime = createRealtimeApi(this.httpClient);

    this.responses = createResponsesApi(this.httpClient);

    this.threads = createThreadsApi(this.httpClient);

    this.tool = createToolApi(this.httpClient);

    this.uploads = createUploadsApi(this.httpClient);

    this.vectorStores = createVectorStoresApi(this.httpClient);

    this.video = createVideoApi(this.httpClient);

    this.videosVidu = createVideosViduApi(this.httpClient);

    this.imagesVidu = createImagesViduApi(this.httpClient);

    this.audioVidu = createAudioViduApi(this.httpClient);

    this.audioVolcengine = createAudioVolcengineApi(this.httpClient);

    this.videosVolcengine = createVideosVolcengineApi(this.httpClient);

    this.imagesVolcengine = createImagesVolcengineApi(this.httpClient);

    this.imagesXai = createImagesXaiApi(this.httpClient);

    this.videosXai = createVideosXaiApi(this.httpClient);

    this.videosZhipu = createVideosZhipuApi(this.httpClient);

    this.imagesZhipu = createImagesZhipuApi(this.httpClient);
  }

  setApiKey(apiKey: string): this {
    this.httpClient.setApiKey(apiKey);
    return this;
  }

  setAuthToken(token: string): this {
    this.httpClient.setAuthToken(token);
    return this;
  }

  setAccessToken(token: string): this {
    this.httpClient.setAccessToken(token);
    return this;
  }

  setTokenManager(manager: AuthTokenManager): this {
    this.httpClient.setTokenManager(manager);
    return this;
  }

  get http(): HttpClient {
    return this.httpClient;
  }
}

export function createClient(config: SdkworkAiConfig): SdkworkAiClient {
  return new SdkworkAiClient(config);
}

export default SdkworkAiClient;
