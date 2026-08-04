import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkAiConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { FilesAnthropicApi, createFilesAnthropicApi } from './api/files-anthropic';
import { ChatAnthropicApi, createChatAnthropicApi } from './api/chat-anthropic';
import { BatchesAnthropicApi, createBatchesAnthropicApi } from './api/batches-anthropic';
import { ResponsesGoogleApi, createResponsesGoogleApi } from './api/responses-google';
import { FilesGoogleApi, createFilesGoogleApi } from './api/files-google';
import { EmbeddingsGoogleApi, createEmbeddingsGoogleApi } from './api/embeddings-google';
import { ChatGoogleApi, createChatGoogleApi } from './api/chat-google';
import { VideosKlingApi, createVideosKlingApi } from './api/videos-kling';
import { ImagesMidjourneyApi, createImagesMidjourneyApi } from './api/images-midjourney';
import { ImagesNanoBananaApi, createImagesNanoBananaApi } from './api/images-nano-banana';
import { AudioSunoApi, createAudioSunoApi } from './api/audio-suno';
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
import { UploadsApi, createUploadsApi } from './api/uploads';
import { VectorStoresApi, createVectorStoresApi } from './api/vector-stores';
import { VideoApi, createVideoApi } from './api/video';
import { VideosViduApi, createVideosViduApi } from './api/videos-vidu';
import { ImagesViduApi, createImagesViduApi } from './api/images-vidu';
import { VideosVolcengineApi, createVideosVolcengineApi } from './api/videos-volcengine';

export class SdkworkAiClient {
  private httpClient: HttpClient;

  public readonly filesAnthropic: FilesAnthropicApi;
  public readonly chatAnthropic: ChatAnthropicApi;
  public readonly batchesAnthropic: BatchesAnthropicApi;
  public readonly responsesGoogle: ResponsesGoogleApi;
  public readonly filesGoogle: FilesGoogleApi;
  public readonly embeddingsGoogle: EmbeddingsGoogleApi;
  public readonly chatGoogle: ChatGoogleApi;
  public readonly videosKling: VideosKlingApi;
  public readonly imagesMidjourney: ImagesMidjourneyApi;
  public readonly imagesNanoBanana: ImagesNanoBananaApi;
  public readonly audioSuno: AudioSunoApi;
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
  public readonly uploads: UploadsApi;
  public readonly vectorStores: VectorStoresApi;
  public readonly video: VideoApi;
  public readonly videosVidu: VideosViduApi;
  public readonly imagesVidu: ImagesViduApi;
  public readonly videosVolcengine: VideosVolcengineApi;

  constructor(config: SdkworkAiConfig) {
    this.httpClient = createHttpClient(config);
    this.filesAnthropic = createFilesAnthropicApi(this.httpClient);

    this.chatAnthropic = createChatAnthropicApi(this.httpClient);

    this.batchesAnthropic = createBatchesAnthropicApi(this.httpClient);

    this.responsesGoogle = createResponsesGoogleApi(this.httpClient);

    this.filesGoogle = createFilesGoogleApi(this.httpClient);

    this.embeddingsGoogle = createEmbeddingsGoogleApi(this.httpClient);

    this.chatGoogle = createChatGoogleApi(this.httpClient);

    this.videosKling = createVideosKlingApi(this.httpClient);

    this.imagesMidjourney = createImagesMidjourneyApi(this.httpClient);

    this.imagesNanoBanana = createImagesNanoBananaApi(this.httpClient);

    this.audioSuno = createAudioSunoApi(this.httpClient);

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

    this.uploads = createUploadsApi(this.httpClient);

    this.vectorStores = createVectorStoresApi(this.httpClient);

    this.video = createVideoApi(this.httpClient);

    this.videosVidu = createVideosViduApi(this.httpClient);

    this.imagesVidu = createImagesViduApi(this.httpClient);

    this.videosVolcengine = createVideosVolcengineApi(this.httpClient);
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
