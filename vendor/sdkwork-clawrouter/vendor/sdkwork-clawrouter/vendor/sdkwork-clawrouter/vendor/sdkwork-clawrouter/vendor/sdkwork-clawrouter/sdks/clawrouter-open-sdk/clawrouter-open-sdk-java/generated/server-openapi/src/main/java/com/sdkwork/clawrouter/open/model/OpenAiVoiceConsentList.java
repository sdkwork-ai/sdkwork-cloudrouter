package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiVoiceConsentList {
    private List<OpenAiVoiceConsent> data;
    private String firstId;
    private Boolean hasMore;
    private String lastId;
    private String object;

    public List<OpenAiVoiceConsent> getData() {
        return this.data;
    }

    public void setData(List<OpenAiVoiceConsent> data) {
        this.data = data;
    }

    public String getFirstId() {
        return this.firstId;
    }

    public void setFirstId(String firstId) {
        this.firstId = firstId;
    }

    public Boolean getHasMore() {
        return this.hasMore;
    }

    public void setHasMore(Boolean hasMore) {
        this.hasMore = hasMore;
    }

    public String getLastId() {
        return this.lastId;
    }

    public void setLastId(String lastId) {
        this.lastId = lastId;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }
}
