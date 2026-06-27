package com.sdkwork.clawrouter.open.model;


public class CreateCompletionChoice {
    private String finishReason;
    private Integer index;
    private CreateCompletionLogprobs logprobs;
    private String text;

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

    public CreateCompletionLogprobs getLogprobs() {
        return this.logprobs;
    }

    public void setLogprobs(CreateCompletionLogprobs logprobs) {
        this.logprobs = logprobs;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }
}
