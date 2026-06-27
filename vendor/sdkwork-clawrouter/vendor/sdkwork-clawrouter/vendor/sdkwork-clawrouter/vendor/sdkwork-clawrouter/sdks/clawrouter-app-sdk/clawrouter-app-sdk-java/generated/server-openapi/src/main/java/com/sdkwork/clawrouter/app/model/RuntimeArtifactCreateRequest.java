package com.sdkwork.clawrouter.app.model;

import java.util.Map;

public class RuntimeArtifactCreateRequest {
    private String artifactType;
    private Map<String, String> contentJson;
    private String contentText;
    private Map<String, String> metadata;
    private String mimeType;
    private String name;
    private MediaResource resource;
    private String sha256;
    private String sizeBytes;
    private String storageKey;

    public String getArtifactType() {
        return this.artifactType;
    }

    public void setArtifactType(String artifactType) {
        this.artifactType = artifactType;
    }

    public Map<String, String> getContentJson() {
        return this.contentJson;
    }

    public void setContentJson(Map<String, String> contentJson) {
        this.contentJson = contentJson;
    }

    public String getContentText() {
        return this.contentText;
    }

    public void setContentText(String contentText) {
        this.contentText = contentText;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getMimeType() {
        return this.mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public MediaResource getResource() {
        return this.resource;
    }

    public void setResource(MediaResource resource) {
        this.resource = resource;
    }

    public String getSha256() {
        return this.sha256;
    }

    public void setSha256(String sha256) {
        this.sha256 = sha256;
    }

    public String getSizeBytes() {
        return this.sizeBytes;
    }

    public void setSizeBytes(String sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public String getStorageKey() {
        return this.storageKey;
    }

    public void setStorageKey(String storageKey) {
        this.storageKey = storageKey;
    }
}
