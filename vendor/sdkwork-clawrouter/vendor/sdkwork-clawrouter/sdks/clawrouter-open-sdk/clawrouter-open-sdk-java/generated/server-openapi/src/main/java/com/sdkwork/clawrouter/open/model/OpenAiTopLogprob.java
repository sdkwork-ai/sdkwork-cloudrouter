package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiTopLogprob {
    private List<Integer> bytes;
    private Double logprob;
    private String token;

    public List<Integer> getBytes() {
        return this.bytes;
    }

    public void setBytes(List<Integer> bytes) {
        this.bytes = bytes;
    }

    public Double getLogprob() {
        return this.logprob;
    }

    public void setLogprob(Double logprob) {
        this.logprob = logprob;
    }

    public String getToken() {
        return this.token;
    }

    public void setToken(String token) {
        this.token = token;
    }
}
