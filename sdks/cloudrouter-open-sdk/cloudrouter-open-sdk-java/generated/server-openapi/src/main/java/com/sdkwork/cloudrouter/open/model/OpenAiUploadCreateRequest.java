package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class OpenAiUploadCreateRequest {
    private Integer bytes;
    private Map<String, String> expiresAfter;
    private String filename;
    private String mimeType;
    private String purpose;

    public Integer getBytes() {
        return this.bytes;
    }

    public void setBytes(Integer bytes) {
        this.bytes = bytes;
    }

    public Map<String, String> getExpiresAfter() {
        return this.expiresAfter;
    }

    public void setExpiresAfter(Map<String, String> expiresAfter) {
        this.expiresAfter = expiresAfter;
    }

    public String getFilename() {
        return this.filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getMimeType() {
        return this.mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public String getPurpose() {
        return this.purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }
}
