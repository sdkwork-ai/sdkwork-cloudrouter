package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class ProviderTaskResult {
    private List<ProviderGeneratedMedia> audios;
    private List<VolcengineContentPart> content;
    private String id;
    private List<ProviderGeneratedMedia> images;
    private Map<String, String> metadata;
    private String status;
    private String text;
    private List<ProviderGeneratedMedia> videos;

    public List<ProviderGeneratedMedia> getAudios() {
        return this.audios;
    }

    public void setAudios(List<ProviderGeneratedMedia> audios) {
        this.audios = audios;
    }

    public List<VolcengineContentPart> getContent() {
        return this.content;
    }

    public void setContent(List<VolcengineContentPart> content) {
        this.content = content;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public List<ProviderGeneratedMedia> getImages() {
        return this.images;
    }

    public void setImages(List<ProviderGeneratedMedia> images) {
        this.images = images;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public List<ProviderGeneratedMedia> getVideos() {
        return this.videos;
    }

    public void setVideos(List<ProviderGeneratedMedia> videos) {
        this.videos = videos;
    }
}
