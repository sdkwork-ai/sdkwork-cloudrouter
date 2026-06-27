package com.sdkwork.clawrouter.open;

import com.sdkwork.common.core.Types;
import com.sdkwork.clawrouter.open.http.HttpClient;
import com.sdkwork.clawrouter.open.api.FilesAnthropicApi;
import com.sdkwork.clawrouter.open.api.ChatAnthropicApi;
import com.sdkwork.clawrouter.open.api.BatchesAnthropicApi;
import com.sdkwork.clawrouter.open.api.ResponsesGoogleApi;
import com.sdkwork.clawrouter.open.api.FilesGoogleApi;
import com.sdkwork.clawrouter.open.api.EmbeddingsGoogleApi;
import com.sdkwork.clawrouter.open.api.ChatGoogleApi;
import com.sdkwork.clawrouter.open.api.VideosKlingApi;
import com.sdkwork.clawrouter.open.api.ImagesMidjourneyApi;
import com.sdkwork.clawrouter.open.api.ImagesNanoBananaApi;
import com.sdkwork.clawrouter.open.api.AudioSunoApi;
import com.sdkwork.clawrouter.open.api.AssistantsApi;
import com.sdkwork.clawrouter.open.api.AudioApi;
import com.sdkwork.clawrouter.open.api.BatchesApi;
import com.sdkwork.clawrouter.open.api.ChatApi;
import com.sdkwork.clawrouter.open.api.CompletionApi;
import com.sdkwork.clawrouter.open.api.ContainerApi;
import com.sdkwork.clawrouter.open.api.ConversationApi;
import com.sdkwork.clawrouter.open.api.EmbeddingsApi;
import com.sdkwork.clawrouter.open.api.EvalApi;
import com.sdkwork.clawrouter.open.api.FilesApi;
import com.sdkwork.clawrouter.open.api.FineTuningApi;
import com.sdkwork.clawrouter.open.api.ImagesApi;
import com.sdkwork.clawrouter.open.api.ModelsApi;
import com.sdkwork.clawrouter.open.api.ModerationsApi;
import com.sdkwork.clawrouter.open.api.OrganizationApi;
import com.sdkwork.clawrouter.open.api.ProjectApi;
import com.sdkwork.clawrouter.open.api.RealtimeApi;
import com.sdkwork.clawrouter.open.api.ResponsesApi;
import com.sdkwork.clawrouter.open.api.SkillApi;
import com.sdkwork.clawrouter.open.api.ThreadsApi;
import com.sdkwork.clawrouter.open.api.UploadsApi;
import com.sdkwork.clawrouter.open.api.VectorStoresApi;
import com.sdkwork.clawrouter.open.api.VideoApi;
import com.sdkwork.clawrouter.open.api.VideosViduApi;
import com.sdkwork.clawrouter.open.api.ImagesViduApi;
import com.sdkwork.clawrouter.open.api.VideosVolcengineApi;

public class SdkworkAiClient {
    private final HttpClient httpClient;
    private FilesAnthropicApi filesAnthropic;
    private ChatAnthropicApi chatAnthropic;
    private BatchesAnthropicApi batchesAnthropic;
    private ResponsesGoogleApi responsesGoogle;
    private FilesGoogleApi filesGoogle;
    private EmbeddingsGoogleApi embeddingsGoogle;
    private ChatGoogleApi chatGoogle;
    private VideosKlingApi videosKling;
    private ImagesMidjourneyApi imagesMidjourney;
    private ImagesNanoBananaApi imagesNanoBanana;
    private AudioSunoApi audioSuno;
    private AssistantsApi assistants;
    private AudioApi audio;
    private BatchesApi batches;
    private ChatApi chat;
    private CompletionApi completion;
    private ContainerApi container;
    private ConversationApi conversation;
    private EmbeddingsApi embeddings;
    private EvalApi eval;
    private FilesApi files;
    private FineTuningApi fineTuning;
    private ImagesApi images;
    private ModelsApi models;
    private ModerationsApi moderations;
    private OrganizationApi organization;
    private ProjectApi project;
    private RealtimeApi realtime;
    private ResponsesApi responses;
    private SkillApi skill;
    private ThreadsApi threads;
    private UploadsApi uploads;
    private VectorStoresApi vectorStores;
    private VideoApi video;
    private VideosViduApi videosVidu;
    private ImagesViduApi imagesVidu;
    private VideosVolcengineApi videosVolcengine;

    public SdkworkAiClient(String baseUrl) {
        this.httpClient = new HttpClient(baseUrl);
        this.filesAnthropic = new FilesAnthropicApi(httpClient);
        this.chatAnthropic = new ChatAnthropicApi(httpClient);
        this.batchesAnthropic = new BatchesAnthropicApi(httpClient);
        this.responsesGoogle = new ResponsesGoogleApi(httpClient);
        this.filesGoogle = new FilesGoogleApi(httpClient);
        this.embeddingsGoogle = new EmbeddingsGoogleApi(httpClient);
        this.chatGoogle = new ChatGoogleApi(httpClient);
        this.videosKling = new VideosKlingApi(httpClient);
        this.imagesMidjourney = new ImagesMidjourneyApi(httpClient);
        this.imagesNanoBanana = new ImagesNanoBananaApi(httpClient);
        this.audioSuno = new AudioSunoApi(httpClient);
        this.assistants = new AssistantsApi(httpClient);
        this.audio = new AudioApi(httpClient);
        this.batches = new BatchesApi(httpClient);
        this.chat = new ChatApi(httpClient);
        this.completion = new CompletionApi(httpClient);
        this.container = new ContainerApi(httpClient);
        this.conversation = new ConversationApi(httpClient);
        this.embeddings = new EmbeddingsApi(httpClient);
        this.eval = new EvalApi(httpClient);
        this.files = new FilesApi(httpClient);
        this.fineTuning = new FineTuningApi(httpClient);
        this.images = new ImagesApi(httpClient);
        this.models = new ModelsApi(httpClient);
        this.moderations = new ModerationsApi(httpClient);
        this.organization = new OrganizationApi(httpClient);
        this.project = new ProjectApi(httpClient);
        this.realtime = new RealtimeApi(httpClient);
        this.responses = new ResponsesApi(httpClient);
        this.skill = new SkillApi(httpClient);
        this.threads = new ThreadsApi(httpClient);
        this.uploads = new UploadsApi(httpClient);
        this.vectorStores = new VectorStoresApi(httpClient);
        this.video = new VideoApi(httpClient);
        this.videosVidu = new VideosViduApi(httpClient);
        this.imagesVidu = new ImagesViduApi(httpClient);
        this.videosVolcengine = new VideosVolcengineApi(httpClient);
    }

    public SdkworkAiClient(Types.SdkConfig config) {
        this.httpClient = new HttpClient(config);
        this.filesAnthropic = new FilesAnthropicApi(httpClient);
        this.chatAnthropic = new ChatAnthropicApi(httpClient);
        this.batchesAnthropic = new BatchesAnthropicApi(httpClient);
        this.responsesGoogle = new ResponsesGoogleApi(httpClient);
        this.filesGoogle = new FilesGoogleApi(httpClient);
        this.embeddingsGoogle = new EmbeddingsGoogleApi(httpClient);
        this.chatGoogle = new ChatGoogleApi(httpClient);
        this.videosKling = new VideosKlingApi(httpClient);
        this.imagesMidjourney = new ImagesMidjourneyApi(httpClient);
        this.imagesNanoBanana = new ImagesNanoBananaApi(httpClient);
        this.audioSuno = new AudioSunoApi(httpClient);
        this.assistants = new AssistantsApi(httpClient);
        this.audio = new AudioApi(httpClient);
        this.batches = new BatchesApi(httpClient);
        this.chat = new ChatApi(httpClient);
        this.completion = new CompletionApi(httpClient);
        this.container = new ContainerApi(httpClient);
        this.conversation = new ConversationApi(httpClient);
        this.embeddings = new EmbeddingsApi(httpClient);
        this.eval = new EvalApi(httpClient);
        this.files = new FilesApi(httpClient);
        this.fineTuning = new FineTuningApi(httpClient);
        this.images = new ImagesApi(httpClient);
        this.models = new ModelsApi(httpClient);
        this.moderations = new ModerationsApi(httpClient);
        this.organization = new OrganizationApi(httpClient);
        this.project = new ProjectApi(httpClient);
        this.realtime = new RealtimeApi(httpClient);
        this.responses = new ResponsesApi(httpClient);
        this.skill = new SkillApi(httpClient);
        this.threads = new ThreadsApi(httpClient);
        this.uploads = new UploadsApi(httpClient);
        this.vectorStores = new VectorStoresApi(httpClient);
        this.video = new VideoApi(httpClient);
        this.videosVidu = new VideosViduApi(httpClient);
        this.imagesVidu = new ImagesViduApi(httpClient);
        this.videosVolcengine = new VideosVolcengineApi(httpClient);
    }

    public FilesAnthropicApi getFilesAnthropic() {
        return this.filesAnthropic;
    }

    public ChatAnthropicApi getChatAnthropic() {
        return this.chatAnthropic;
    }

    public BatchesAnthropicApi getBatchesAnthropic() {
        return this.batchesAnthropic;
    }

    public ResponsesGoogleApi getResponsesGoogle() {
        return this.responsesGoogle;
    }

    public FilesGoogleApi getFilesGoogle() {
        return this.filesGoogle;
    }

    public EmbeddingsGoogleApi getEmbeddingsGoogle() {
        return this.embeddingsGoogle;
    }

    public ChatGoogleApi getChatGoogle() {
        return this.chatGoogle;
    }

    public VideosKlingApi getVideosKling() {
        return this.videosKling;
    }

    public ImagesMidjourneyApi getImagesMidjourney() {
        return this.imagesMidjourney;
    }

    public ImagesNanoBananaApi getImagesNanoBanana() {
        return this.imagesNanoBanana;
    }

    public AudioSunoApi getAudioSuno() {
        return this.audioSuno;
    }

    public AssistantsApi getAssistants() {
        return this.assistants;
    }

    public AudioApi getAudio() {
        return this.audio;
    }

    public BatchesApi getBatches() {
        return this.batches;
    }

    public ChatApi getChat() {
        return this.chat;
    }

    public CompletionApi getCompletion() {
        return this.completion;
    }

    public ContainerApi getContainer() {
        return this.container;
    }

    public ConversationApi getConversation() {
        return this.conversation;
    }

    public EmbeddingsApi getEmbeddings() {
        return this.embeddings;
    }

    public EvalApi getEval() {
        return this.eval;
    }

    public FilesApi getFiles() {
        return this.files;
    }

    public FineTuningApi getFineTuning() {
        return this.fineTuning;
    }

    public ImagesApi getImages() {
        return this.images;
    }

    public ModelsApi getModels() {
        return this.models;
    }

    public ModerationsApi getModerations() {
        return this.moderations;
    }

    public OrganizationApi getOrganization() {
        return this.organization;
    }

    public ProjectApi getProject() {
        return this.project;
    }

    public RealtimeApi getRealtime() {
        return this.realtime;
    }

    public ResponsesApi getResponses() {
        return this.responses;
    }

    public SkillApi getSkill() {
        return this.skill;
    }

    public ThreadsApi getThreads() {
        return this.threads;
    }

    public UploadsApi getUploads() {
        return this.uploads;
    }

    public VectorStoresApi getVectorStores() {
        return this.vectorStores;
    }

    public VideoApi getVideo() {
        return this.video;
    }

    public VideosViduApi getVideosVidu() {
        return this.videosVidu;
    }

    public ImagesViduApi getImagesVidu() {
        return this.imagesVidu;
    }

    public VideosVolcengineApi getVideosVolcengine() {
        return this.videosVolcengine;
    }

    public SdkworkAiClient setApiKey(String apiKey) {
        httpClient.setApiKey(apiKey);
        return this;
    }

    public SdkworkAiClient setAuthToken(String token) {
        httpClient.setAuthToken(token);
        return this;
    }

    public SdkworkAiClient setAccessToken(String token) {
        httpClient.setAccessToken(token);
        return this;
    }

    public SdkworkAiClient setHeader(String key, String value) {
        httpClient.setHeader(key, value);
        return this;
    }

    public HttpClient getHttpClient() {
        return httpClient;
    }
}
