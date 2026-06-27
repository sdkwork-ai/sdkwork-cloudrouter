package com.sdkwork.clawrouter.open.model;


public class OpenAiCompletionTokensDetails {
    private Integer acceptedPredictionTokens;
    private Integer audioTokens;
    private Integer reasoningTokens;
    private Integer rejectedPredictionTokens;

    public Integer getAcceptedPredictionTokens() {
        return this.acceptedPredictionTokens;
    }

    public void setAcceptedPredictionTokens(Integer acceptedPredictionTokens) {
        this.acceptedPredictionTokens = acceptedPredictionTokens;
    }

    public Integer getAudioTokens() {
        return this.audioTokens;
    }

    public void setAudioTokens(Integer audioTokens) {
        this.audioTokens = audioTokens;
    }

    public Integer getReasoningTokens() {
        return this.reasoningTokens;
    }

    public void setReasoningTokens(Integer reasoningTokens) {
        this.reasoningTokens = reasoningTokens;
    }

    public Integer getRejectedPredictionTokens() {
        return this.rejectedPredictionTokens;
    }

    public void setRejectedPredictionTokens(Integer rejectedPredictionTokens) {
        this.rejectedPredictionTokens = rejectedPredictionTokens;
    }
}
