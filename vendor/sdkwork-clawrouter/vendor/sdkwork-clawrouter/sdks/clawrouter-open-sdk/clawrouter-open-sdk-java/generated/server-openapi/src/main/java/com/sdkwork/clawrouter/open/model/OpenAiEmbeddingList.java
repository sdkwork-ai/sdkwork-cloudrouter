package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiEmbeddingList {
    private List<OpenAiEmbedding> data;
    private String model;
    private String object;
    private OpenAiEmbeddingUsage usage;

    public List<OpenAiEmbedding> getData() {
        return this.data;
    }

    public void setData(List<OpenAiEmbedding> data) {
        this.data = data;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public OpenAiEmbeddingUsage getUsage() {
        return this.usage;
    }

    public void setUsage(OpenAiEmbeddingUsage usage) {
        this.usage = usage;
    }
}
