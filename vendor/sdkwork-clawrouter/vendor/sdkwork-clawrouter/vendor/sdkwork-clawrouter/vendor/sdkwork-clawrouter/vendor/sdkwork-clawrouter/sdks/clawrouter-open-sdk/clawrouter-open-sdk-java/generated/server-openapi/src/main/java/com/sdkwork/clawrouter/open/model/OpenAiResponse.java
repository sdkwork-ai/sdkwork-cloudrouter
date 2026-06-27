package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiResponse {
    private Integer createdAt;
    private OpenAiResponseError error;
    private String id;
    private OpenAiIncompleteDetails incompleteDetails;
    private String model;
    private String object;
    private List<OpenAiResponseOutputItem> output;
    private String outputText;
    private String status;
    private OpenAiResponseUsage usage;

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public OpenAiResponseError getError() {
        return this.error;
    }

    public void setError(OpenAiResponseError error) {
        this.error = error;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public OpenAiIncompleteDetails getIncompleteDetails() {
        return this.incompleteDetails;
    }

    public void setIncompleteDetails(OpenAiIncompleteDetails incompleteDetails) {
        this.incompleteDetails = incompleteDetails;
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

    public List<OpenAiResponseOutputItem> getOutput() {
        return this.output;
    }

    public void setOutput(List<OpenAiResponseOutputItem> output) {
        this.output = output;
    }

    public String getOutputText() {
        return this.outputText;
    }

    public void setOutputText(String outputText) {
        this.outputText = outputText;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OpenAiResponseUsage getUsage() {
        return this.usage;
    }

    public void setUsage(OpenAiResponseUsage usage) {
        this.usage = usage;
    }
}
