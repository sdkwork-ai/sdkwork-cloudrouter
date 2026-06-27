package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiImageList {
    private Integer created;
    private List<OpenAiImage> data;
    private OpenAiTokenUsage usage;

    public Integer getCreated() {
        return this.created;
    }

    public void setCreated(Integer created) {
        this.created = created;
    }

    public List<OpenAiImage> getData() {
        return this.data;
    }

    public void setData(List<OpenAiImage> data) {
        this.data = data;
    }

    public OpenAiTokenUsage getUsage() {
        return this.usage;
    }

    public void setUsage(OpenAiTokenUsage usage) {
        this.usage = usage;
    }
}
