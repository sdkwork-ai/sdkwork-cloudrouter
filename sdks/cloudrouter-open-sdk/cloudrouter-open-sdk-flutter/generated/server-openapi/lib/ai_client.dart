import 'package:sdkwork_common_flutter/sdkwork_common_flutter.dart';
import 'src/http/client.dart';
import 'src/api/files_anthropic.dart';
import 'src/api/chat_anthropic.dart';
import 'src/api/batches_anthropic.dart';
import 'src/api/responses_google.dart';
import 'src/api/files_google.dart';
import 'src/api/embeddings_google.dart';
import 'src/api/chat_google.dart';
import 'src/api/videos_kling.dart';
import 'src/api/images_midjourney.dart';
import 'src/api/images_nano_banana.dart';
import 'src/api/audio_suno.dart';
import 'src/api/assistants.dart';
import 'src/api/audio.dart';
import 'src/api/batches.dart';
import 'src/api/chat.dart';
import 'src/api/completion.dart';
import 'src/api/container.dart';
import 'src/api/conversation.dart';
import 'src/api/embeddings.dart';
import 'src/api/files.dart';
import 'src/api/images.dart';
import 'src/api/models.dart';
import 'src/api/moderations.dart';
import 'src/api/realtime.dart';
import 'src/api/responses.dart';
import 'src/api/threads.dart';
import 'src/api/uploads.dart';
import 'src/api/vector_stores.dart';
import 'src/api/video.dart';
import 'src/api/videos_vidu.dart';
import 'src/api/images_vidu.dart';
import 'src/api/videos_volcengine.dart';

class SdkworkAiClient {
  final HttpClient _httpClient;

  late final FilesAnthropicApi filesAnthropic;
  late final ChatAnthropicApi chatAnthropic;
  late final BatchesAnthropicApi batchesAnthropic;
  late final ResponsesGoogleApi responsesGoogle;
  late final FilesGoogleApi filesGoogle;
  late final EmbeddingsGoogleApi embeddingsGoogle;
  late final ChatGoogleApi chatGoogle;
  late final VideosKlingApi videosKling;
  late final ImagesMidjourneyApi imagesMidjourney;
  late final ImagesNanoBananaApi imagesNanoBanana;
  late final AudioSunoApi audioSuno;
  late final AssistantsApi assistants;
  late final AudioApi audio;
  late final BatchesApi batches;
  late final ChatApi chat;
  late final CompletionApi completion;
  late final ContainerApi container;
  late final ConversationApi conversation;
  late final EmbeddingsApi embeddings;
  late final FilesApi files;
  late final ImagesApi images;
  late final ModelsApi models;
  late final ModerationsApi moderations;
  late final RealtimeApi realtime;
  late final ResponsesApi responses;
  late final ThreadsApi threads;
  late final UploadsApi uploads;
  late final VectorStoresApi vectorStores;
  late final VideoApi video;
  late final VideosViduApi videosVidu;
  late final ImagesViduApi imagesVidu;
  late final VideosVolcengineApi videosVolcengine;

  SdkworkAiClient({
    required SdkConfig config,
  }) : _httpClient = HttpClient(config: config) {
    filesAnthropic = FilesAnthropicApi(_httpClient);
    chatAnthropic = ChatAnthropicApi(_httpClient);
    batchesAnthropic = BatchesAnthropicApi(_httpClient);
    responsesGoogle = ResponsesGoogleApi(_httpClient);
    filesGoogle = FilesGoogleApi(_httpClient);
    embeddingsGoogle = EmbeddingsGoogleApi(_httpClient);
    chatGoogle = ChatGoogleApi(_httpClient);
    videosKling = VideosKlingApi(_httpClient);
    imagesMidjourney = ImagesMidjourneyApi(_httpClient);
    imagesNanoBanana = ImagesNanoBananaApi(_httpClient);
    audioSuno = AudioSunoApi(_httpClient);
    assistants = AssistantsApi(_httpClient);
    audio = AudioApi(_httpClient);
    batches = BatchesApi(_httpClient);
    chat = ChatApi(_httpClient);
    completion = CompletionApi(_httpClient);
    container = ContainerApi(_httpClient);
    conversation = ConversationApi(_httpClient);
    embeddings = EmbeddingsApi(_httpClient);
    files = FilesApi(_httpClient);
    images = ImagesApi(_httpClient);
    models = ModelsApi(_httpClient);
    moderations = ModerationsApi(_httpClient);
    realtime = RealtimeApi(_httpClient);
    responses = ResponsesApi(_httpClient);
    threads = ThreadsApi(_httpClient);
    uploads = UploadsApi(_httpClient);
    vectorStores = VectorStoresApi(_httpClient);
    video = VideoApi(_httpClient);
    videosVidu = VideosViduApi(_httpClient);
    imagesVidu = ImagesViduApi(_httpClient);
    videosVolcengine = VideosVolcengineApi(_httpClient);
  }

  factory SdkworkAiClient.withBaseUrl({
    required String baseUrl,
    String? apiKey,
    String? authToken,
    String? accessToken,
    String apiKeyHeader = 'Authorization',
    bool apiKeyAsBearer = true,
    Map<String, String>? headers,
    int timeout = 30000,
  }) {
    return SdkworkAiClient(
      config: SdkConfig(
        baseUrl: baseUrl,
        timeout: timeout,
        headers: headers ?? const {},
        apiKey: apiKey,
        apiKeyHeader: apiKeyHeader,
        apiKeyAsBearer: apiKeyAsBearer,
        authToken: authToken,
        accessToken: accessToken,
      ),
    );
  }

  void setApiKey(String apiKey) {
    _httpClient.setApiKey(apiKey);
  }

  void setAuthToken(String token) {
    _httpClient.setAuthToken(token);
  }

  void setAccessToken(String token) {
    _httpClient.setAccessToken(token);
  }

  void setHeader(String key, String value) {
    _httpClient.setHeader(key, value);
  }
}
