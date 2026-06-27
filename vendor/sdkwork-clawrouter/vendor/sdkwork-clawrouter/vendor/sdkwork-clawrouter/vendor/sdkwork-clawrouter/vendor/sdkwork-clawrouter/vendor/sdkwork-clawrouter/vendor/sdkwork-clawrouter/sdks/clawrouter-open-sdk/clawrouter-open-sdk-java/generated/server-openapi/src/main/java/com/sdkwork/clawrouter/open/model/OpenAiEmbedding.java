package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiEmbedding {
    private List<Double> embedding;
    private Integer index;
    private String object;

    public List<Double> getEmbedding() {
        return this.embedding;
    }

    public void setEmbedding(List<Double> embedding) {
        this.embedding = embedding;
    }

    public Integer getIndex() {
        return this.index;
    }

    public void setIndex(Integer index) {
        this.index = index;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }
}
