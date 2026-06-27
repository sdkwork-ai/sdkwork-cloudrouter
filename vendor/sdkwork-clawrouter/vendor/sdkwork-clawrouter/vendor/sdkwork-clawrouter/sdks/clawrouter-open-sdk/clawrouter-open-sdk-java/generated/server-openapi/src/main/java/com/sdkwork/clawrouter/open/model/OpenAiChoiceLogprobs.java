package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiChoiceLogprobs {
    private List<OpenAiTokenLogprob> content;
    private List<OpenAiTokenLogprob> refusal;

    public List<OpenAiTokenLogprob> getContent() {
        return this.content;
    }

    public void setContent(List<OpenAiTokenLogprob> content) {
        this.content = content;
    }

    public List<OpenAiTokenLogprob> getRefusal() {
        return this.refusal;
    }

    public void setRefusal(List<OpenAiTokenLogprob> refusal) {
        this.refusal = refusal;
    }
}
