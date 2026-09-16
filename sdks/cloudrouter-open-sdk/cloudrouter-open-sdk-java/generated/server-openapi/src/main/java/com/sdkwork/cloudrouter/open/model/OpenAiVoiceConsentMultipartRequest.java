package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class OpenAiVoiceConsentMultipartRequest {
    private byte[] file;
    private Map<String, String> metadata;
    private String name;

    public byte[] getFile() {
        return this.file;
    }

    public void setFile(byte[] file) {
        this.file = file;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
