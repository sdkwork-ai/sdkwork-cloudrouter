package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class XaiGeneratedImage {
    private String b64Json;
    private Map<String, String> fileOutput;
    private String mimeType;
    private String storageError;
    private String url;

    public String getB64Json() {
        return this.b64Json;
    }

    public void setB64Json(String b64Json) {
        this.b64Json = b64Json;
    }

    public Map<String, String> getFileOutput() {
        return this.fileOutput;
    }

    public void setFileOutput(Map<String, String> fileOutput) {
        this.fileOutput = fileOutput;
    }

    public String getMimeType() {
        return this.mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public String getStorageError() {
        return this.storageError;
    }

    public void setStorageError(String storageError) {
        this.storageError = storageError;
    }

    public String getUrl() {
        return this.url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
}
