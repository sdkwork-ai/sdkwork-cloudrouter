using System;
using SDKwork.Common.Core;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;
using Sdkwork.CloudRouter.Open.Api;

namespace Sdkwork.CloudRouter.Open
{
    public class SdkworkAiClient
    {
        private readonly SdkHttpClient _httpClient;

        public ImagesAlibabaApi ImagesAlibaba { get; }
        public VideosAlibabaApi VideosAlibaba { get; }
        public AudioAlibabaApi AudioAlibaba { get; }
        public FilesAnthropicApi FilesAnthropic { get; }
        public ChatAnthropicApi ChatAnthropic { get; }
        public BatchesAnthropicApi BatchesAnthropic { get; }
        public VideosBlackForestLabsApi VideosBlackForestLabs { get; }
        public ImagesBlackForestLabsApi ImagesBlackForestLabs { get; }
        public VideosBytedanceApi VideosBytedance { get; }
        public ImagesBytedanceApi ImagesBytedance { get; }
        public AudioBytedanceApi AudioBytedance { get; }
        public MusicElevenlabsApi MusicElevenlabs { get; }
        public AudioElevenlabsApi AudioElevenlabs { get; }
        public ResponsesGoogleApi ResponsesGoogle { get; }
        public FilesGoogleApi FilesGoogle { get; }
        public VideosGoogleApi VideosGoogle { get; }
        public EmbeddingsGoogleApi EmbeddingsGoogle { get; }
        public ChatGoogleApi ChatGoogle { get; }
        public ImagesGoogleApi ImagesGoogle { get; }
        public VideosJimengApi VideosJimeng { get; }
        public AudioKlingApi AudioKling { get; }
        public ImagesKlingApi ImagesKling { get; }
        public VideosKlingApi VideosKling { get; }
        public VideosLumaAiApi VideosLumaAi { get; }
        public VideosMinimaxApi VideosMinimax { get; }
        public ImagesMinimaxApi ImagesMinimax { get; }
        public MusicMinimaxApi MusicMinimax { get; }
        public AudioMinimaxApi AudioMinimax { get; }
        public MusicMurekaApi MusicMureka { get; }
        public VideosPixverseApi VideosPixverse { get; }
        public VideosRunwayApi VideosRunway { get; }
        public ImagesRunwayApi ImagesRunway { get; }
        public AudioStabilityAiApi AudioStabilityAi { get; }
        public ImagesStabilityAiApi ImagesStabilityAi { get; }
        public MusicSunoApi MusicSuno { get; }
        public ChatTypesafeApi ChatTypesafe { get; }
        public AssistantsApi Assistants { get; }
        public AudioApi Audio { get; }
        public BatchesApi Batches { get; }
        public ChatApi Chat { get; }
        public CompletionApi Completion { get; }
        public ContainerApi Container { get; }
        public ConversationApi Conversation { get; }
        public EmbeddingsApi Embeddings { get; }
        public FilesApi Files { get; }
        public ImagesApi Images { get; }
        public ModelsApi Models { get; }
        public ModerationsApi Moderations { get; }
        public RealtimeApi Realtime { get; }
        public ResponsesApi Responses { get; }
        public ThreadsApi Threads { get; }
        public ToolApi Tool { get; }
        public UploadsApi Uploads { get; }
        public VectorStoresApi VectorStores { get; }
        public VideoApi Video { get; }
        public VideosViduApi VideosVidu { get; }
        public ImagesViduApi ImagesVidu { get; }
        public AudioViduApi AudioVidu { get; }
        public AudioVolcengineApi AudioVolcengine { get; }
        public VideosVolcengineApi VideosVolcengine { get; }
        public ImagesVolcengineApi ImagesVolcengine { get; }
        public ImagesXaiApi ImagesXai { get; }
        public VideosXaiApi VideosXai { get; }
        public VideosZhipuApi VideosZhipu { get; }
        public ImagesZhipuApi ImagesZhipu { get; }

        public SdkworkAiClient(string baseUrl)
        {
            _httpClient = new SdkHttpClient(baseUrl);
            ImagesAlibaba = new ImagesAlibabaApi(_httpClient);
            VideosAlibaba = new VideosAlibabaApi(_httpClient);
            AudioAlibaba = new AudioAlibabaApi(_httpClient);
            FilesAnthropic = new FilesAnthropicApi(_httpClient);
            ChatAnthropic = new ChatAnthropicApi(_httpClient);
            BatchesAnthropic = new BatchesAnthropicApi(_httpClient);
            VideosBlackForestLabs = new VideosBlackForestLabsApi(_httpClient);
            ImagesBlackForestLabs = new ImagesBlackForestLabsApi(_httpClient);
            VideosBytedance = new VideosBytedanceApi(_httpClient);
            ImagesBytedance = new ImagesBytedanceApi(_httpClient);
            AudioBytedance = new AudioBytedanceApi(_httpClient);
            MusicElevenlabs = new MusicElevenlabsApi(_httpClient);
            AudioElevenlabs = new AudioElevenlabsApi(_httpClient);
            ResponsesGoogle = new ResponsesGoogleApi(_httpClient);
            FilesGoogle = new FilesGoogleApi(_httpClient);
            VideosGoogle = new VideosGoogleApi(_httpClient);
            EmbeddingsGoogle = new EmbeddingsGoogleApi(_httpClient);
            ChatGoogle = new ChatGoogleApi(_httpClient);
            ImagesGoogle = new ImagesGoogleApi(_httpClient);
            VideosJimeng = new VideosJimengApi(_httpClient);
            AudioKling = new AudioKlingApi(_httpClient);
            ImagesKling = new ImagesKlingApi(_httpClient);
            VideosKling = new VideosKlingApi(_httpClient);
            VideosLumaAi = new VideosLumaAiApi(_httpClient);
            VideosMinimax = new VideosMinimaxApi(_httpClient);
            ImagesMinimax = new ImagesMinimaxApi(_httpClient);
            MusicMinimax = new MusicMinimaxApi(_httpClient);
            AudioMinimax = new AudioMinimaxApi(_httpClient);
            MusicMureka = new MusicMurekaApi(_httpClient);
            VideosPixverse = new VideosPixverseApi(_httpClient);
            VideosRunway = new VideosRunwayApi(_httpClient);
            ImagesRunway = new ImagesRunwayApi(_httpClient);
            AudioStabilityAi = new AudioStabilityAiApi(_httpClient);
            ImagesStabilityAi = new ImagesStabilityAiApi(_httpClient);
            MusicSuno = new MusicSunoApi(_httpClient);
            ChatTypesafe = new ChatTypesafeApi(_httpClient);
            Assistants = new AssistantsApi(_httpClient);
            Audio = new AudioApi(_httpClient);
            Batches = new BatchesApi(_httpClient);
            Chat = new ChatApi(_httpClient);
            Completion = new CompletionApi(_httpClient);
            Container = new ContainerApi(_httpClient);
            Conversation = new ConversationApi(_httpClient);
            Embeddings = new EmbeddingsApi(_httpClient);
            Files = new FilesApi(_httpClient);
            Images = new ImagesApi(_httpClient);
            Models = new ModelsApi(_httpClient);
            Moderations = new ModerationsApi(_httpClient);
            Realtime = new RealtimeApi(_httpClient);
            Responses = new ResponsesApi(_httpClient);
            Threads = new ThreadsApi(_httpClient);
            Tool = new ToolApi(_httpClient);
            Uploads = new UploadsApi(_httpClient);
            VectorStores = new VectorStoresApi(_httpClient);
            Video = new VideoApi(_httpClient);
            VideosVidu = new VideosViduApi(_httpClient);
            ImagesVidu = new ImagesViduApi(_httpClient);
            AudioVidu = new AudioViduApi(_httpClient);
            AudioVolcengine = new AudioVolcengineApi(_httpClient);
            VideosVolcengine = new VideosVolcengineApi(_httpClient);
            ImagesVolcengine = new ImagesVolcengineApi(_httpClient);
            ImagesXai = new ImagesXaiApi(_httpClient);
            VideosXai = new VideosXaiApi(_httpClient);
            VideosZhipu = new VideosZhipuApi(_httpClient);
            ImagesZhipu = new ImagesZhipuApi(_httpClient);
        }

        public SdkworkAiClient(SdkConfig config)
        {
            _httpClient = new SdkHttpClient(config);
            ImagesAlibaba = new ImagesAlibabaApi(_httpClient);
            VideosAlibaba = new VideosAlibabaApi(_httpClient);
            AudioAlibaba = new AudioAlibabaApi(_httpClient);
            FilesAnthropic = new FilesAnthropicApi(_httpClient);
            ChatAnthropic = new ChatAnthropicApi(_httpClient);
            BatchesAnthropic = new BatchesAnthropicApi(_httpClient);
            VideosBlackForestLabs = new VideosBlackForestLabsApi(_httpClient);
            ImagesBlackForestLabs = new ImagesBlackForestLabsApi(_httpClient);
            VideosBytedance = new VideosBytedanceApi(_httpClient);
            ImagesBytedance = new ImagesBytedanceApi(_httpClient);
            AudioBytedance = new AudioBytedanceApi(_httpClient);
            MusicElevenlabs = new MusicElevenlabsApi(_httpClient);
            AudioElevenlabs = new AudioElevenlabsApi(_httpClient);
            ResponsesGoogle = new ResponsesGoogleApi(_httpClient);
            FilesGoogle = new FilesGoogleApi(_httpClient);
            VideosGoogle = new VideosGoogleApi(_httpClient);
            EmbeddingsGoogle = new EmbeddingsGoogleApi(_httpClient);
            ChatGoogle = new ChatGoogleApi(_httpClient);
            ImagesGoogle = new ImagesGoogleApi(_httpClient);
            VideosJimeng = new VideosJimengApi(_httpClient);
            AudioKling = new AudioKlingApi(_httpClient);
            ImagesKling = new ImagesKlingApi(_httpClient);
            VideosKling = new VideosKlingApi(_httpClient);
            VideosLumaAi = new VideosLumaAiApi(_httpClient);
            VideosMinimax = new VideosMinimaxApi(_httpClient);
            ImagesMinimax = new ImagesMinimaxApi(_httpClient);
            MusicMinimax = new MusicMinimaxApi(_httpClient);
            AudioMinimax = new AudioMinimaxApi(_httpClient);
            MusicMureka = new MusicMurekaApi(_httpClient);
            VideosPixverse = new VideosPixverseApi(_httpClient);
            VideosRunway = new VideosRunwayApi(_httpClient);
            ImagesRunway = new ImagesRunwayApi(_httpClient);
            AudioStabilityAi = new AudioStabilityAiApi(_httpClient);
            ImagesStabilityAi = new ImagesStabilityAiApi(_httpClient);
            MusicSuno = new MusicSunoApi(_httpClient);
            ChatTypesafe = new ChatTypesafeApi(_httpClient);
            Assistants = new AssistantsApi(_httpClient);
            Audio = new AudioApi(_httpClient);
            Batches = new BatchesApi(_httpClient);
            Chat = new ChatApi(_httpClient);
            Completion = new CompletionApi(_httpClient);
            Container = new ContainerApi(_httpClient);
            Conversation = new ConversationApi(_httpClient);
            Embeddings = new EmbeddingsApi(_httpClient);
            Files = new FilesApi(_httpClient);
            Images = new ImagesApi(_httpClient);
            Models = new ModelsApi(_httpClient);
            Moderations = new ModerationsApi(_httpClient);
            Realtime = new RealtimeApi(_httpClient);
            Responses = new ResponsesApi(_httpClient);
            Threads = new ThreadsApi(_httpClient);
            Tool = new ToolApi(_httpClient);
            Uploads = new UploadsApi(_httpClient);
            VectorStores = new VectorStoresApi(_httpClient);
            Video = new VideoApi(_httpClient);
            VideosVidu = new VideosViduApi(_httpClient);
            ImagesVidu = new ImagesViduApi(_httpClient);
            AudioVidu = new AudioViduApi(_httpClient);
            AudioVolcengine = new AudioVolcengineApi(_httpClient);
            VideosVolcengine = new VideosVolcengineApi(_httpClient);
            ImagesVolcengine = new ImagesVolcengineApi(_httpClient);
            ImagesXai = new ImagesXaiApi(_httpClient);
            VideosXai = new VideosXaiApi(_httpClient);
            VideosZhipu = new VideosZhipuApi(_httpClient);
            ImagesZhipu = new ImagesZhipuApi(_httpClient);
        }

        public SdkworkAiClient SetApiKey(string apiKey)
        {
            _httpClient.SetApiKey(apiKey);
            return this;
        }

        public SdkworkAiClient SetAuthToken(string token)
        {
            _httpClient.SetAuthToken(token);
            return this;
        }

        public SdkworkAiClient SetAccessToken(string token)
        {
            _httpClient.SetAccessToken(token);
            return this;
        }

        public SdkworkAiClient SetHeader(string key, string value)
        {
            _httpClient.SetHeader(key, value);
            return this;
        }
    }
}
