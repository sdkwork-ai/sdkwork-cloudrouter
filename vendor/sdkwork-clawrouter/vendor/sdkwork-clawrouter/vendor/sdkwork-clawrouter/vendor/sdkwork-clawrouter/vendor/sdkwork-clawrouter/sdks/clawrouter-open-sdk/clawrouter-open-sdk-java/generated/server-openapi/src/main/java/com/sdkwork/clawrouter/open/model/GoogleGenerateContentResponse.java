package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class GoogleGenerateContentResponse {
    private List<GoogleCandidate> candidates;
    private String modelVersion;
    private GooglePromptFeedback promptFeedback;
    private String responseId;
    private GoogleUsageMetadata usageMetadata;

    public List<GoogleCandidate> getCandidates() {
        return this.candidates;
    }

    public void setCandidates(List<GoogleCandidate> candidates) {
        this.candidates = candidates;
    }

    public String getModelVersion() {
        return this.modelVersion;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }

    public GooglePromptFeedback getPromptFeedback() {
        return this.promptFeedback;
    }

    public void setPromptFeedback(GooglePromptFeedback promptFeedback) {
        this.promptFeedback = promptFeedback;
    }

    public String getResponseId() {
        return this.responseId;
    }

    public void setResponseId(String responseId) {
        this.responseId = responseId;
    }

    public GoogleUsageMetadata getUsageMetadata() {
        return this.usageMetadata;
    }

    public void setUsageMetadata(GoogleUsageMetadata usageMetadata) {
        this.usageMetadata = usageMetadata;
    }
}
