package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiModelList {
    private List<OpenAiModel> data;
    private String object;

    public List<OpenAiModel> getData() {
        return this.data;
    }

    public void setData(List<OpenAiModel> data) {
        this.data = data;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }
}
