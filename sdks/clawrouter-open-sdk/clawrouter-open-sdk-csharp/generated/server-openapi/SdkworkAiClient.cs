using System;
using SDKwork.Common.Core;
using SdkHttpClient = Sdkwork.ClawRouter.Open.Http.HttpClient;
using Sdkwork.ClawRouter.Open.Api;

namespace Sdkwork.ClawRouter.Open
{
    public class SdkworkAiClient
    {
        private readonly SdkHttpClient _httpClient;

        public FilesAnthropicApi FilesAnthropic { get; }
        public ChatAnthropicApi ChatAnthropic { get; }
        public BatchesAnthropicApi BatchesAnthropic { get; }
        public ResponsesGoogleApi ResponsesGoogle { get; }
        public FilesGoogleApi FilesGoogle { get; }
        public EmbeddingsGoogleApi EmbeddingsGoogle { get; }
        public ChatGoogleApi ChatGoogle { get; }
        public VideosKlingApi VideosKling { get; }
        public ImagesMidjourneyApi ImagesMidjourney { get; }
        public ImagesNanoBananaApi ImagesNanoBanana { get; }
        public AudioSunoApi AudioSuno { get; }
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
        public UploadsApi Uploads { get; }
        public VectorStoresApi VectorStores { get; }
        public VideoApi Video { get; }
        public VideosViduApi VideosVidu { get; }
        public ImagesViduApi ImagesVidu { get; }
        public VideosVolcengineApi VideosVolcengine { get; }

        public SdkworkAiClient(string baseUrl)
        {
            _httpClient = new SdkHttpClient(baseUrl);
            FilesAnthropic = new FilesAnthropicApi(_httpClient);
            ChatAnthropic = new ChatAnthropicApi(_httpClient);
            BatchesAnthropic = new BatchesAnthropicApi(_httpClient);
            ResponsesGoogle = new ResponsesGoogleApi(_httpClient);
            FilesGoogle = new FilesGoogleApi(_httpClient);
            EmbeddingsGoogle = new EmbeddingsGoogleApi(_httpClient);
            ChatGoogle = new ChatGoogleApi(_httpClient);
            VideosKling = new VideosKlingApi(_httpClient);
            ImagesMidjourney = new ImagesMidjourneyApi(_httpClient);
            ImagesNanoBanana = new ImagesNanoBananaApi(_httpClient);
            AudioSuno = new AudioSunoApi(_httpClient);
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
            Uploads = new UploadsApi(_httpClient);
            VectorStores = new VectorStoresApi(_httpClient);
            Video = new VideoApi(_httpClient);
            VideosVidu = new VideosViduApi(_httpClient);
            ImagesVidu = new ImagesViduApi(_httpClient);
            VideosVolcengine = new VideosVolcengineApi(_httpClient);
        }

        public SdkworkAiClient(SdkConfig config)
        {
            _httpClient = new SdkHttpClient(config);
            FilesAnthropic = new FilesAnthropicApi(_httpClient);
            ChatAnthropic = new ChatAnthropicApi(_httpClient);
            BatchesAnthropic = new BatchesAnthropicApi(_httpClient);
            ResponsesGoogle = new ResponsesGoogleApi(_httpClient);
            FilesGoogle = new FilesGoogleApi(_httpClient);
            EmbeddingsGoogle = new EmbeddingsGoogleApi(_httpClient);
            ChatGoogle = new ChatGoogleApi(_httpClient);
            VideosKling = new VideosKlingApi(_httpClient);
            ImagesMidjourney = new ImagesMidjourneyApi(_httpClient);
            ImagesNanoBanana = new ImagesNanoBananaApi(_httpClient);
            AudioSuno = new AudioSunoApi(_httpClient);
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
            Uploads = new UploadsApi(_httpClient);
            VectorStores = new VectorStoresApi(_httpClient);
            Video = new VideoApi(_httpClient);
            VideosVidu = new VideosViduApi(_httpClient);
            ImagesVidu = new ImagesViduApi(_httpClient);
            VideosVolcengine = new VideosVolcengineApi(_httpClient);
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
