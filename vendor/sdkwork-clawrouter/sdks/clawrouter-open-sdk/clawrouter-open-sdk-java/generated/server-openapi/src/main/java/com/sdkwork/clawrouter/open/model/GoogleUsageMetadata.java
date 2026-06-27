package com.sdkwork.clawrouter.open.model;


public class GoogleUsageMetadata {
    private Integer cachedContentTokenCount;
    private Integer candidatesTokenCount;
    private Integer promptTokenCount;
    private Integer thoughtsTokenCount;
    private Integer totalTokenCount;

    public Integer getCachedContentTokenCount() {
        return this.cachedContentTokenCount;
    }

    public void setCachedContentTokenCount(Integer cachedContentTokenCount) {
        this.cachedContentTokenCount = cachedContentTokenCount;
    }

    public Integer getCandidatesTokenCount() {
        return this.candidatesTokenCount;
    }

    public void setCandidatesTokenCount(Integer candidatesTokenCount) {
        this.candidatesTokenCount = candidatesTokenCount;
    }

    public Integer getPromptTokenCount() {
        return this.promptTokenCount;
    }

    public void setPromptTokenCount(Integer promptTokenCount) {
        this.promptTokenCount = promptTokenCount;
    }

    public Integer getThoughtsTokenCount() {
        return this.thoughtsTokenCount;
    }

    public void setThoughtsTokenCount(Integer thoughtsTokenCount) {
        this.thoughtsTokenCount = thoughtsTokenCount;
    }

    public Integer getTotalTokenCount() {
        return this.totalTokenCount;
    }

    public void setTotalTokenCount(Integer totalTokenCount) {
        this.totalTokenCount = totalTokenCount;
    }
}
