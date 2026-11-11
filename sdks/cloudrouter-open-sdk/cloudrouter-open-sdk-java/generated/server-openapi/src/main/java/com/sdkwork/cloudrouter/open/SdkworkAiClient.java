package com.sdkwork.cloudrouter.open;

import com.sdkwork.common.core.Types;
import com.sdkwork.cloudrouter.open.http.HttpClient;
import com.sdkwork.cloudrouter.open.api.ImagesAlibabaApi;
import com.sdkwork.cloudrouter.open.api.VideosAlibabaApi;
import com.sdkwork.cloudrouter.open.api.AudioAlibabaApi;
import com.sdkwork.cloudrouter.open.api.FilesAnthropicApi;
import com.sdkwork.cloudrouter.open.api.ChatAnthropicApi;
import com.sdkwork.cloudrouter.open.api.BatchesAnthropicApi;
import com.sdkwork.cloudrouter.open.api.VideosBlackForestLabsApi;
import com.sdkwork.cloudrouter.open.api.ImagesBlackForestLabsApi;
import com.sdkwork.cloudrouter.open.api.VideosBytedanceApi;
import com.sdkwork.cloudrouter.open.api.ImagesBytedanceApi;
import com.sdkwork.cloudrouter.open.api.AudioBytedanceApi;
import com.sdkwork.cloudrouter.open.api.MusicElevenlabsApi;
import com.sdkwork.cloudrouter.open.api.AudioElevenlabsApi;
import com.sdkwork.cloudrouter.open.api.ResponsesGoogleApi;
import com.sdkwork.cloudrouter.open.api.FilesGoogleApi;
import com.sdkwork.cloudrouter.open.api.VideosGoogleApi;
import com.sdkwork.cloudrouter.open.api.EmbeddingsGoogleApi;
import com.sdkwork.cloudrouter.open.api.ChatGoogleApi;
import com.sdkwork.cloudrouter.open.api.ImagesGoogleApi;
import com.sdkwork.cloudrouter.open.api.VideosJimengApi;
import com.sdkwork.cloudrouter.open.api.AudioKlingApi;
import com.sdkwork.cloudrouter.open.api.ImagesKlingApi;
import com.sdkwork.cloudrouter.open.api.VideosKlingApi;
import com.sdkwork.cloudrouter.open.api.VideosLumaAiApi;
import com.sdkwork.cloudrouter.open.api.VideosMinimaxApi;
import com.sdkwork.cloudrouter.open.api.ImagesMinimaxApi;
import com.sdkwork.cloudrouter.open.api.MusicMinimaxApi;
import com.sdkwork.cloudrouter.open.api.AudioMinimaxApi;
import com.sdkwork.cloudrouter.open.api.MusicMurekaApi;
import com.sdkwork.cloudrouter.open.api.VideosPixverseApi;
import com.sdkwork.cloudrouter.open.api.VideosRunwayApi;
import com.sdkwork.cloudrouter.open.api.ImagesRunwayApi;
import com.sdkwork.cloudrouter.open.api.AudioStabilityAiApi;
import com.sdkwork.cloudrouter.open.api.ImagesStabilityAiApi;
import com.sdkwork.cloudrouter.open.api.MusicSunoApi;
import com.sdkwork.cloudrouter.open.api.ChatTypesafeApi;
import com.sdkwork.cloudrouter.open.api.AssistantsApi;
import com.sdkwork.cloudrouter.open.api.AudioApi;
import com.sdkwork.cloudrouter.open.api.BatchesApi;
import com.sdkwork.cloudrouter.open.api.ChatApi;
import com.sdkwork.cloudrouter.open.api.CompletionApi;
import com.sdkwork.cloudrouter.open.api.ContainerApi;
import com.sdkwork.cloudrouter.open.api.ConversationApi;
import com.sdkwork.cloudrouter.open.api.EmbeddingsApi;
import com.sdkwork.cloudrouter.open.api.FilesApi;
import com.sdkwork.cloudrouter.open.api.ImagesApi;
import com.sdkwork.cloudrouter.open.api.ModelsApi;
import com.sdkwork.cloudrouter.open.api.ModerationsApi;
import com.sdkwork.cloudrouter.open.api.RealtimeApi;
import com.sdkwork.cloudrouter.open.api.ResponsesApi;
import com.sdkwork.cloudrouter.open.api.ThreadsApi;
import com.sdkwork.cloudrouter.open.api.ToolApi;
import com.sdkwork.cloudrouter.open.api.UploadsApi;
import com.sdkwork.cloudrouter.open.api.VectorStoresApi;
import com.sdkwork.cloudrouter.open.api.VideoApi;
import com.sdkwork.cloudrouter.open.api.VideosViduApi;
import com.sdkwork.cloudrouter.open.api.ImagesViduApi;
import com.sdkwork.cloudrouter.open.api.AudioViduApi;
import com.sdkwork.cloudrouter.open.api.AudioVolcengineApi;
import com.sdkwork.cloudrouter.open.api.VideosVolcengineApi;
import com.sdkwork.cloudrouter.open.api.ImagesVolcengineApi;
import com.sdkwork.cloudrouter.open.api.ImagesXaiApi;
import com.sdkwork.cloudrouter.open.api.VideosXaiApi;
import com.sdkwork.cloudrouter.open.api.VideosZhipuApi;
import com.sdkwork.cloudrouter.open.api.ImagesZhipuApi;

public class SdkworkAiClient {
    private final HttpClient httpClient;
    private ImagesAlibabaApi imagesAlibaba;
    private VideosAlibabaApi videosAlibaba;
    private AudioAlibabaApi audioAlibaba;
    private FilesAnthropicApi filesAnthropic;
    private ChatAnthropicApi chatAnthropic;
    private BatchesAnthropicApi batchesAnthropic;
    private VideosBlackForestLabsApi videosBlackForestLabs;
    private ImagesBlackForestLabsApi imagesBlackForestLabs;
    private VideosBytedanceApi videosBytedance;
    private ImagesBytedanceApi imagesBytedance;
    private AudioBytedanceApi audioBytedance;
    private MusicElevenlabsApi musicElevenlabs;
    private AudioElevenlabsApi audioElevenlabs;
    private ResponsesGoogleApi responsesGoogle;
    private FilesGoogleApi filesGoogle;
    private VideosGoogleApi videosGoogle;
    private EmbeddingsGoogleApi embeddingsGoogle;
    private ChatGoogleApi chatGoogle;
    private ImagesGoogleApi imagesGoogle;
    private VideosJimengApi videosJimeng;
    private AudioKlingApi audioKling;
    private ImagesKlingApi imagesKling;
    private VideosKlingApi videosKling;
    private VideosLumaAiApi videosLumaAi;
    private VideosMinimaxApi videosMinimax;
    private ImagesMinimaxApi imagesMinimax;
    private MusicMinimaxApi musicMinimax;
    private AudioMinimaxApi audioMinimax;
    private MusicMurekaApi musicMureka;
    private VideosPixverseApi videosPixverse;
    private VideosRunwayApi videosRunway;
    private ImagesRunwayApi imagesRunway;
    private AudioStabilityAiApi audioStabilityAi;
    private ImagesStabilityAiApi imagesStabilityAi;
    private MusicSunoApi musicSuno;
    private ChatTypesafeApi chatTypesafe;
    private AssistantsApi assistants;
    private AudioApi audio;
    private BatchesApi batches;
    private ChatApi chat;
    private CompletionApi completion;
    private ContainerApi container;
    private ConversationApi conversation;
    private EmbeddingsApi embeddings;
    private FilesApi files;
    private ImagesApi images;
    private ModelsApi models;
    private ModerationsApi moderations;
    private RealtimeApi realtime;
    private ResponsesApi responses;
    private ThreadsApi threads;
    private ToolApi tool;
    private UploadsApi uploads;
    private VectorStoresApi vectorStores;
    private VideoApi video;
    private VideosViduApi videosVidu;
    private ImagesViduApi imagesVidu;
    private AudioViduApi audioVidu;
    private AudioVolcengineApi audioVolcengine;
    private VideosVolcengineApi videosVolcengine;
    private ImagesVolcengineApi imagesVolcengine;
    private ImagesXaiApi imagesXai;
    private VideosXaiApi videosXai;
    private VideosZhipuApi videosZhipu;
    private ImagesZhipuApi imagesZhipu;

    public SdkworkAiClient(String baseUrl) {
        this.httpClient = new HttpClient(baseUrl);
        this.imagesAlibaba = new ImagesAlibabaApi(httpClient);
        this.videosAlibaba = new VideosAlibabaApi(httpClient);
        this.audioAlibaba = new AudioAlibabaApi(httpClient);
        this.filesAnthropic = new FilesAnthropicApi(httpClient);
        this.chatAnthropic = new ChatAnthropicApi(httpClient);
        this.batchesAnthropic = new BatchesAnthropicApi(httpClient);
        this.videosBlackForestLabs = new VideosBlackForestLabsApi(httpClient);
        this.imagesBlackForestLabs = new ImagesBlackForestLabsApi(httpClient);
        this.videosBytedance = new VideosBytedanceApi(httpClient);
        this.imagesBytedance = new ImagesBytedanceApi(httpClient);
        this.audioBytedance = new AudioBytedanceApi(httpClient);
        this.musicElevenlabs = new MusicElevenlabsApi(httpClient);
        this.audioElevenlabs = new AudioElevenlabsApi(httpClient);
        this.responsesGoogle = new ResponsesGoogleApi(httpClient);
        this.filesGoogle = new FilesGoogleApi(httpClient);
        this.videosGoogle = new VideosGoogleApi(httpClient);
        this.embeddingsGoogle = new EmbeddingsGoogleApi(httpClient);
        this.chatGoogle = new ChatGoogleApi(httpClient);
        this.imagesGoogle = new ImagesGoogleApi(httpClient);
        this.videosJimeng = new VideosJimengApi(httpClient);
        this.audioKling = new AudioKlingApi(httpClient);
        this.imagesKling = new ImagesKlingApi(httpClient);
        this.videosKling = new VideosKlingApi(httpClient);
        this.videosLumaAi = new VideosLumaAiApi(httpClient);
        this.videosMinimax = new VideosMinimaxApi(httpClient);
        this.imagesMinimax = new ImagesMinimaxApi(httpClient);
        this.musicMinimax = new MusicMinimaxApi(httpClient);
        this.audioMinimax = new AudioMinimaxApi(httpClient);
        this.musicMureka = new MusicMurekaApi(httpClient);
        this.videosPixverse = new VideosPixverseApi(httpClient);
        this.videosRunway = new VideosRunwayApi(httpClient);
        this.imagesRunway = new ImagesRunwayApi(httpClient);
        this.audioStabilityAi = new AudioStabilityAiApi(httpClient);
        this.imagesStabilityAi = new ImagesStabilityAiApi(httpClient);
        this.musicSuno = new MusicSunoApi(httpClient);
        this.chatTypesafe = new ChatTypesafeApi(httpClient);
        this.assistants = new AssistantsApi(httpClient);
        this.audio = new AudioApi(httpClient);
        this.batches = new BatchesApi(httpClient);
        this.chat = new ChatApi(httpClient);
        this.completion = new CompletionApi(httpClient);
        this.container = new ContainerApi(httpClient);
        this.conversation = new ConversationApi(httpClient);
        this.embeddings = new EmbeddingsApi(httpClient);
        this.files = new FilesApi(httpClient);
        this.images = new ImagesApi(httpClient);
        this.models = new ModelsApi(httpClient);
        this.moderations = new ModerationsApi(httpClient);
        this.realtime = new RealtimeApi(httpClient);
        this.responses = new ResponsesApi(httpClient);
        this.threads = new ThreadsApi(httpClient);
        this.tool = new ToolApi(httpClient);
        this.uploads = new UploadsApi(httpClient);
        this.vectorStores = new VectorStoresApi(httpClient);
        this.video = new VideoApi(httpClient);
        this.videosVidu = new VideosViduApi(httpClient);
        this.imagesVidu = new ImagesViduApi(httpClient);
        this.audioVidu = new AudioViduApi(httpClient);
        this.audioVolcengine = new AudioVolcengineApi(httpClient);
        this.videosVolcengine = new VideosVolcengineApi(httpClient);
        this.imagesVolcengine = new ImagesVolcengineApi(httpClient);
        this.imagesXai = new ImagesXaiApi(httpClient);
        this.videosXai = new VideosXaiApi(httpClient);
        this.videosZhipu = new VideosZhipuApi(httpClient);
        this.imagesZhipu = new ImagesZhipuApi(httpClient);
    }

    public SdkworkAiClient(Types.SdkConfig config) {
        this.httpClient = new HttpClient(config);
        this.imagesAlibaba = new ImagesAlibabaApi(httpClient);
        this.videosAlibaba = new VideosAlibabaApi(httpClient);
        this.audioAlibaba = new AudioAlibabaApi(httpClient);
        this.filesAnthropic = new FilesAnthropicApi(httpClient);
        this.chatAnthropic = new ChatAnthropicApi(httpClient);
        this.batchesAnthropic = new BatchesAnthropicApi(httpClient);
        this.videosBlackForestLabs = new VideosBlackForestLabsApi(httpClient);
        this.imagesBlackForestLabs = new ImagesBlackForestLabsApi(httpClient);
        this.videosBytedance = new VideosBytedanceApi(httpClient);
        this.imagesBytedance = new ImagesBytedanceApi(httpClient);
        this.audioBytedance = new AudioBytedanceApi(httpClient);
        this.musicElevenlabs = new MusicElevenlabsApi(httpClient);
        this.audioElevenlabs = new AudioElevenlabsApi(httpClient);
        this.responsesGoogle = new ResponsesGoogleApi(httpClient);
        this.filesGoogle = new FilesGoogleApi(httpClient);
        this.videosGoogle = new VideosGoogleApi(httpClient);
        this.embeddingsGoogle = new EmbeddingsGoogleApi(httpClient);
        this.chatGoogle = new ChatGoogleApi(httpClient);
        this.imagesGoogle = new ImagesGoogleApi(httpClient);
        this.videosJimeng = new VideosJimengApi(httpClient);
        this.audioKling = new AudioKlingApi(httpClient);
        this.imagesKling = new ImagesKlingApi(httpClient);
        this.videosKling = new VideosKlingApi(httpClient);
        this.videosLumaAi = new VideosLumaAiApi(httpClient);
        this.videosMinimax = new VideosMinimaxApi(httpClient);
        this.imagesMinimax = new ImagesMinimaxApi(httpClient);
        this.musicMinimax = new MusicMinimaxApi(httpClient);
        this.audioMinimax = new AudioMinimaxApi(httpClient);
        this.musicMureka = new MusicMurekaApi(httpClient);
        this.videosPixverse = new VideosPixverseApi(httpClient);
        this.videosRunway = new VideosRunwayApi(httpClient);
        this.imagesRunway = new ImagesRunwayApi(httpClient);
        this.audioStabilityAi = new AudioStabilityAiApi(httpClient);
        this.imagesStabilityAi = new ImagesStabilityAiApi(httpClient);
        this.musicSuno = new MusicSunoApi(httpClient);
        this.chatTypesafe = new ChatTypesafeApi(httpClient);
        this.assistants = new AssistantsApi(httpClient);
        this.audio = new AudioApi(httpClient);
        this.batches = new BatchesApi(httpClient);
        this.chat = new ChatApi(httpClient);
        this.completion = new CompletionApi(httpClient);
        this.container = new ContainerApi(httpClient);
        this.conversation = new ConversationApi(httpClient);
        this.embeddings = new EmbeddingsApi(httpClient);
        this.files = new FilesApi(httpClient);
        this.images = new ImagesApi(httpClient);
        this.models = new ModelsApi(httpClient);
        this.moderations = new ModerationsApi(httpClient);
        this.realtime = new RealtimeApi(httpClient);
        this.responses = new ResponsesApi(httpClient);
        this.threads = new ThreadsApi(httpClient);
        this.tool = new ToolApi(httpClient);
        this.uploads = new UploadsApi(httpClient);
        this.vectorStores = new VectorStoresApi(httpClient);
        this.video = new VideoApi(httpClient);
        this.videosVidu = new VideosViduApi(httpClient);
        this.imagesVidu = new ImagesViduApi(httpClient);
        this.audioVidu = new AudioViduApi(httpClient);
        this.audioVolcengine = new AudioVolcengineApi(httpClient);
        this.videosVolcengine = new VideosVolcengineApi(httpClient);
        this.imagesVolcengine = new ImagesVolcengineApi(httpClient);
        this.imagesXai = new ImagesXaiApi(httpClient);
        this.videosXai = new VideosXaiApi(httpClient);
        this.videosZhipu = new VideosZhipuApi(httpClient);
        this.imagesZhipu = new ImagesZhipuApi(httpClient);
    }

    public ImagesAlibabaApi getImagesAlibaba() {
        return this.imagesAlibaba;
    }

    public VideosAlibabaApi getVideosAlibaba() {
        return this.videosAlibaba;
    }

    public AudioAlibabaApi getAudioAlibaba() {
        return this.audioAlibaba;
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

    public VideosBlackForestLabsApi getVideosBlackForestLabs() {
        return this.videosBlackForestLabs;
    }

    public ImagesBlackForestLabsApi getImagesBlackForestLabs() {
        return this.imagesBlackForestLabs;
    }

    public VideosBytedanceApi getVideosBytedance() {
        return this.videosBytedance;
    }

    public ImagesBytedanceApi getImagesBytedance() {
        return this.imagesBytedance;
    }

    public AudioBytedanceApi getAudioBytedance() {
        return this.audioBytedance;
    }

    public MusicElevenlabsApi getMusicElevenlabs() {
        return this.musicElevenlabs;
    }

    public AudioElevenlabsApi getAudioElevenlabs() {
        return this.audioElevenlabs;
    }

    public ResponsesGoogleApi getResponsesGoogle() {
        return this.responsesGoogle;
    }

    public FilesGoogleApi getFilesGoogle() {
        return this.filesGoogle;
    }

    public VideosGoogleApi getVideosGoogle() {
        return this.videosGoogle;
    }

    public EmbeddingsGoogleApi getEmbeddingsGoogle() {
        return this.embeddingsGoogle;
    }

    public ChatGoogleApi getChatGoogle() {
        return this.chatGoogle;
    }

    public ImagesGoogleApi getImagesGoogle() {
        return this.imagesGoogle;
    }

    public VideosJimengApi getVideosJimeng() {
        return this.videosJimeng;
    }

    public AudioKlingApi getAudioKling() {
        return this.audioKling;
    }

    public ImagesKlingApi getImagesKling() {
        return this.imagesKling;
    }

    public VideosKlingApi getVideosKling() {
        return this.videosKling;
    }

    public VideosLumaAiApi getVideosLumaAi() {
        return this.videosLumaAi;
    }

    public VideosMinimaxApi getVideosMinimax() {
        return this.videosMinimax;
    }

    public ImagesMinimaxApi getImagesMinimax() {
        return this.imagesMinimax;
    }

    public MusicMinimaxApi getMusicMinimax() {
        return this.musicMinimax;
    }

    public AudioMinimaxApi getAudioMinimax() {
        return this.audioMinimax;
    }

    public MusicMurekaApi getMusicMureka() {
        return this.musicMureka;
    }

    public VideosPixverseApi getVideosPixverse() {
        return this.videosPixverse;
    }

    public VideosRunwayApi getVideosRunway() {
        return this.videosRunway;
    }

    public ImagesRunwayApi getImagesRunway() {
        return this.imagesRunway;
    }

    public AudioStabilityAiApi getAudioStabilityAi() {
        return this.audioStabilityAi;
    }

    public ImagesStabilityAiApi getImagesStabilityAi() {
        return this.imagesStabilityAi;
    }

    public MusicSunoApi getMusicSuno() {
        return this.musicSuno;
    }

    public ChatTypesafeApi getChatTypesafe() {
        return this.chatTypesafe;
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

    public FilesApi getFiles() {
        return this.files;
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

    public RealtimeApi getRealtime() {
        return this.realtime;
    }

    public ResponsesApi getResponses() {
        return this.responses;
    }

    public ThreadsApi getThreads() {
        return this.threads;
    }

    public ToolApi getTool() {
        return this.tool;
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

    public AudioViduApi getAudioVidu() {
        return this.audioVidu;
    }

    public AudioVolcengineApi getAudioVolcengine() {
        return this.audioVolcengine;
    }

    public VideosVolcengineApi getVideosVolcengine() {
        return this.videosVolcengine;
    }

    public ImagesVolcengineApi getImagesVolcengine() {
        return this.imagesVolcengine;
    }

    public ImagesXaiApi getImagesXai() {
        return this.imagesXai;
    }

    public VideosXaiApi getVideosXai() {
        return this.videosXai;
    }

    public VideosZhipuApi getVideosZhipu() {
        return this.videosZhipu;
    }

    public ImagesZhipuApi getImagesZhipu() {
        return this.imagesZhipu;
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
