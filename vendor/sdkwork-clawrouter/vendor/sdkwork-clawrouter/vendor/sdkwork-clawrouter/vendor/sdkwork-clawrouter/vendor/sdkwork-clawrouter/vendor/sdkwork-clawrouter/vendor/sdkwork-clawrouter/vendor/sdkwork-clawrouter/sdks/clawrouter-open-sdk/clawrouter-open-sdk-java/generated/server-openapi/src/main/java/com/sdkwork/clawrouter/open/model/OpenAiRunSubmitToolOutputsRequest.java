package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiRunSubmitToolOutputsRequest {
    private Boolean stream;
    private List<String> toolOutputs;

    public Boolean getStream() {
        return this.stream;
    }

    public void setStream(Boolean stream) {
        this.stream = stream;
    }

    public List<String> getToolOutputs() {
        return this.toolOutputs;
    }

    public void setToolOutputs(List<String> toolOutputs) {
        this.toolOutputs = toolOutputs;
    }
}
