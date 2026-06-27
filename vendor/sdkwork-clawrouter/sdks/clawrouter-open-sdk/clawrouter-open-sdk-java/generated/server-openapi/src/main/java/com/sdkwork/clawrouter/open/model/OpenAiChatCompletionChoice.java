package com.sdkwork.clawrouter.open.model;


public class OpenAiChatCompletionChoice {
    private String finishReason;
    private Integer index;
    private OpenAiChoiceLogprobs logprobs;
    private OpenAiChatMessage message;

    public String getFinishReason() {
        return this.finishReason;
    }

    public void setFinishReason(String finishReason) {
        this.finishReason = finishReason;
    }

    public Integer getIndex() {
        return this.index;
    }

    public void setIndex(Integer index) {
        this.index = index;
    }

    public OpenAiChoiceLogprobs getLogprobs() {
        return this.logprobs;
    }

    public void setLogprobs(OpenAiChoiceLogprobs logprobs) {
        this.logprobs = logprobs;
    }

    public OpenAiChatMessage getMessage() {
        return this.message;
    }

    public void setMessage(OpenAiChatMessage message) {
        this.message = message;
    }
}
