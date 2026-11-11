package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class ViduTimingToAudioRequest {
    private Boolean bgm;
    private String callbackUrl;
    private Double duration;
    private String model;
    private Boolean offPeak;
    private String payload;
    private Integer seed;
    private List<Map<String, String>> timingPrompts;

    public Boolean getBgm() {
        return this.bgm;
    }

    public void setBgm(Boolean bgm) {
        this.bgm = bgm;
    }

    public String getCallbackUrl() {
        return this.callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }

    public Double getDuration() {
        return this.duration;
    }

    public void setDuration(Double duration) {
        this.duration = duration;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Boolean getOffPeak() {
        return this.offPeak;
    }

    public void setOffPeak(Boolean offPeak) {
        this.offPeak = offPeak;
    }

    public String getPayload() {
        return this.payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public Integer getSeed() {
        return this.seed;
    }

    public void setSeed(Integer seed) {
        this.seed = seed;
    }

    public List<Map<String, String>> getTimingPrompts() {
        return this.timingPrompts;
    }

    public void setTimingPrompts(List<Map<String, String>> timingPrompts) {
        this.timingPrompts = timingPrompts;
    }
}
