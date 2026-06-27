package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class MediaAiProvenance {
    private String generationTaskId;
    private String model;
    private String moderationStatus;
    private String promptId;
    private String provenance;
    private String provider;
    private List<String> safetyLabels;
    private String seed;
    private List<String> sourceMediaIds;

    public String getGenerationTaskId() {
        return this.generationTaskId;
    }

    public void setGenerationTaskId(String generationTaskId) {
        this.generationTaskId = generationTaskId;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getModerationStatus() {
        return this.moderationStatus;
    }

    public void setModerationStatus(String moderationStatus) {
        this.moderationStatus = moderationStatus;
    }

    public String getPromptId() {
        return this.promptId;
    }

    public void setPromptId(String promptId) {
        this.promptId = promptId;
    }

    public String getProvenance() {
        return this.provenance;
    }

    public void setProvenance(String provenance) {
        this.provenance = provenance;
    }

    public String getProvider() {
        return this.provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public List<String> getSafetyLabels() {
        return this.safetyLabels;
    }

    public void setSafetyLabels(List<String> safetyLabels) {
        this.safetyLabels = safetyLabels;
    }

    public String getSeed() {
        return this.seed;
    }

    public void setSeed(String seed) {
        this.seed = seed;
    }

    public List<String> getSourceMediaIds() {
        return this.sourceMediaIds;
    }

    public void setSourceMediaIds(List<String> sourceMediaIds) {
        this.sourceMediaIds = sourceMediaIds;
    }
}
