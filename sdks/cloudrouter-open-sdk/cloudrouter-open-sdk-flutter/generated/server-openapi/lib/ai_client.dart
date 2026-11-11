import 'package:sdkwork_common_flutter/sdkwork_common_flutter.dart';
import 'src/http/client.dart';
import 'src/api/images_alibaba.dart';
import 'src/api/videos_alibaba.dart';
import 'src/api/audio_alibaba.dart';
import 'src/api/files_anthropic.dart';
import 'src/api/chat_anthropic.dart';
import 'src/api/batches_anthropic.dart';
import 'src/api/videos_black_forest_labs.dart';
import 'src/api/images_black_forest_labs.dart';
import 'src/api/videos_bytedance.dart';
import 'src/api/images_bytedance.dart';
import 'src/api/audio_bytedance.dart';
import 'src/api/music_elevenlabs.dart';
import 'src/api/audio_elevenlabs.dart';
import 'src/api/responses_google.dart';
import 'src/api/files_google.dart';
import 'src/api/videos_google.dart';
import 'src/api/embeddings_google.dart';
import 'src/api/chat_google.dart';
import 'src/api/images_google.dart';
import 'src/api/videos_jimeng.dart';
import 'src/api/audio_kling.dart';
import 'src/api/images_kling.dart';
import 'src/api/videos_kling.dart';
import 'src/api/videos_luma_ai.dart';
import 'src/api/videos_minimax.dart';
import 'src/api/images_minimax.dart';
import 'src/api/music_minimax.dart';
import 'src/api/audio_minimax.dart';
import 'src/api/music_mureka.dart';
import 'src/api/videos_pixverse.dart';
import 'src/api/videos_runway.dart';
import 'src/api/images_runway.dart';
import 'src/api/audio_stability_ai.dart';
import 'src/api/images_stability_ai.dart';
import 'src/api/music_suno.dart';
import 'src/api/chat_typesafe.dart';
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
import 'src/api/tool.dart';
import 'src/api/uploads.dart';
import 'src/api/vector_stores.dart';
import 'src/api/video.dart';
import 'src/api/videos_vidu.dart';
import 'src/api/images_vidu.dart';
import 'src/api/audio_vidu.dart';
import 'src/api/audio_volcengine.dart';
import 'src/api/videos_volcengine.dart';
import 'src/api/images_volcengine.dart';
import 'src/api/images_xai.dart';
import 'src/api/videos_xai.dart';
import 'src/api/videos_zhipu.dart';
import 'src/api/images_zhipu.dart';

class SdkworkAiClient {
  final HttpClient _httpClient;

  late final ImagesAlibabaApi imagesAlibaba;
  late final VideosAlibabaApi videosAlibaba;
  late final AudioAlibabaApi audioAlibaba;
  late final FilesAnthropicApi filesAnthropic;
  late final ChatAnthropicApi chatAnthropic;
  late final BatchesAnthropicApi batchesAnthropic;
  late final VideosBlackForestLabsApi videosBlackForestLabs;
  late final ImagesBlackForestLabsApi imagesBlackForestLabs;
  late final VideosBytedanceApi videosBytedance;
  late final ImagesBytedanceApi imagesBytedance;
  late final AudioBytedanceApi audioBytedance;
  late final MusicElevenlabsApi musicElevenlabs;
  late final AudioElevenlabsApi audioElevenlabs;
  late final ResponsesGoogleApi responsesGoogle;
  late final FilesGoogleApi filesGoogle;
  late final VideosGoogleApi videosGoogle;
  late final EmbeddingsGoogleApi embeddingsGoogle;
  late final ChatGoogleApi chatGoogle;
  late final ImagesGoogleApi imagesGoogle;
  late final VideosJimengApi videosJimeng;
  late final AudioKlingApi audioKling;
  late final ImagesKlingApi imagesKling;
  late final VideosKlingApi videosKling;
  late final VideosLumaAiApi videosLumaAi;
  late final VideosMinimaxApi videosMinimax;
  late final ImagesMinimaxApi imagesMinimax;
  late final MusicMinimaxApi musicMinimax;
  late final AudioMinimaxApi audioMinimax;
  late final MusicMurekaApi musicMureka;
  late final VideosPixverseApi videosPixverse;
  late final VideosRunwayApi videosRunway;
  late final ImagesRunwayApi imagesRunway;
  late final AudioStabilityAiApi audioStabilityAi;
  late final ImagesStabilityAiApi imagesStabilityAi;
  late final MusicSunoApi musicSuno;
  late final ChatTypesafeApi chatTypesafe;
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
  late final ToolApi tool;
  late final UploadsApi uploads;
  late final VectorStoresApi vectorStores;
  late final VideoApi video;
  late final VideosViduApi videosVidu;
  late final ImagesViduApi imagesVidu;
  late final AudioViduApi audioVidu;
  late final AudioVolcengineApi audioVolcengine;
  late final VideosVolcengineApi videosVolcengine;
  late final ImagesVolcengineApi imagesVolcengine;
  late final ImagesXaiApi imagesXai;
  late final VideosXaiApi videosXai;
  late final VideosZhipuApi videosZhipu;
  late final ImagesZhipuApi imagesZhipu;

  SdkworkAiClient({
    required SdkConfig config,
  }) : _httpClient = HttpClient(config: config) {
    imagesAlibaba = ImagesAlibabaApi(_httpClient);
    videosAlibaba = VideosAlibabaApi(_httpClient);
    audioAlibaba = AudioAlibabaApi(_httpClient);
    filesAnthropic = FilesAnthropicApi(_httpClient);
    chatAnthropic = ChatAnthropicApi(_httpClient);
    batchesAnthropic = BatchesAnthropicApi(_httpClient);
    videosBlackForestLabs = VideosBlackForestLabsApi(_httpClient);
    imagesBlackForestLabs = ImagesBlackForestLabsApi(_httpClient);
    videosBytedance = VideosBytedanceApi(_httpClient);
    imagesBytedance = ImagesBytedanceApi(_httpClient);
    audioBytedance = AudioBytedanceApi(_httpClient);
    musicElevenlabs = MusicElevenlabsApi(_httpClient);
    audioElevenlabs = AudioElevenlabsApi(_httpClient);
    responsesGoogle = ResponsesGoogleApi(_httpClient);
    filesGoogle = FilesGoogleApi(_httpClient);
    videosGoogle = VideosGoogleApi(_httpClient);
    embeddingsGoogle = EmbeddingsGoogleApi(_httpClient);
    chatGoogle = ChatGoogleApi(_httpClient);
    imagesGoogle = ImagesGoogleApi(_httpClient);
    videosJimeng = VideosJimengApi(_httpClient);
    audioKling = AudioKlingApi(_httpClient);
    imagesKling = ImagesKlingApi(_httpClient);
    videosKling = VideosKlingApi(_httpClient);
    videosLumaAi = VideosLumaAiApi(_httpClient);
    videosMinimax = VideosMinimaxApi(_httpClient);
    imagesMinimax = ImagesMinimaxApi(_httpClient);
    musicMinimax = MusicMinimaxApi(_httpClient);
    audioMinimax = AudioMinimaxApi(_httpClient);
    musicMureka = MusicMurekaApi(_httpClient);
    videosPixverse = VideosPixverseApi(_httpClient);
    videosRunway = VideosRunwayApi(_httpClient);
    imagesRunway = ImagesRunwayApi(_httpClient);
    audioStabilityAi = AudioStabilityAiApi(_httpClient);
    imagesStabilityAi = ImagesStabilityAiApi(_httpClient);
    musicSuno = MusicSunoApi(_httpClient);
    chatTypesafe = ChatTypesafeApi(_httpClient);
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
    tool = ToolApi(_httpClient);
    uploads = UploadsApi(_httpClient);
    vectorStores = VectorStoresApi(_httpClient);
    video = VideoApi(_httpClient);
    videosVidu = VideosViduApi(_httpClient);
    imagesVidu = ImagesViduApi(_httpClient);
    audioVidu = AudioViduApi(_httpClient);
    audioVolcengine = AudioVolcengineApi(_httpClient);
    videosVolcengine = VideosVolcengineApi(_httpClient);
    imagesVolcengine = ImagesVolcengineApi(_httpClient);
    imagesXai = ImagesXaiApi(_httpClient);
    videosXai = VideosXaiApi(_httpClient);
    videosZhipu = VideosZhipuApi(_httpClient);
    imagesZhipu = ImagesZhipuApi(_httpClient);
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
