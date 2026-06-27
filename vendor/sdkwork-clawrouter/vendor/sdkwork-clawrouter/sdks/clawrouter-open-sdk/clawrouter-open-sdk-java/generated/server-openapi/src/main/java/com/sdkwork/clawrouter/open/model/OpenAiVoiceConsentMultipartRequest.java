package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiVoiceConsentMultipartRequest {
    private String file;
    private Map<String, String> metadata;
    private String name;

    public String getFile() {
        return this.file;
    }

    public void setFile(String file) {
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
