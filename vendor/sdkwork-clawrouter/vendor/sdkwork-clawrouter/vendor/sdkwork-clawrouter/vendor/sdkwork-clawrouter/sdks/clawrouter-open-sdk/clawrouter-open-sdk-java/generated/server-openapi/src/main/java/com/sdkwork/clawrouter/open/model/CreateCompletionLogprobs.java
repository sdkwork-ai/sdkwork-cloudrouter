package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class CreateCompletionLogprobs {
    private List<Integer> textOffset;
    private List<Double> tokenLogprobs;
    private List<String> tokens;
    private List<Map<String, Object>> topLogprobs;

    public List<Integer> getTextOffset() {
        return this.textOffset;
    }

    public void setTextOffset(List<Integer> textOffset) {
        this.textOffset = textOffset;
    }

    public List<Double> getTokenLogprobs() {
        return this.tokenLogprobs;
    }

    public void setTokenLogprobs(List<Double> tokenLogprobs) {
        this.tokenLogprobs = tokenLogprobs;
    }

    public List<String> getTokens() {
        return this.tokens;
    }

    public void setTokens(List<String> tokens) {
        this.tokens = tokens;
    }

    public List<Map<String, Object>> getTopLogprobs() {
        return this.topLogprobs;
    }

    public void setTopLogprobs(List<Map<String, Object>> topLogprobs) {
        this.topLogprobs = topLogprobs;
    }
}
