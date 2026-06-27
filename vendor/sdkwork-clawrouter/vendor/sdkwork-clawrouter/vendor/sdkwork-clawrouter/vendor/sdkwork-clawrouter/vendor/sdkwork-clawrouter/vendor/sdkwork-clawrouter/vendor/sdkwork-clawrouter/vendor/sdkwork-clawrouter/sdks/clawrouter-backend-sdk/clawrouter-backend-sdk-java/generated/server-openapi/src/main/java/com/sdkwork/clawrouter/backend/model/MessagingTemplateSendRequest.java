package com.sdkwork.clawrouter.backend.model;

import java.util.Map;

public class MessagingTemplateSendRequest {
    private String channel;
    private String countryCode;
    private String deliveryPurpose;
    private Boolean dryRun;
    private String locale;
    private String sceneCode;
    private String targetHash;
    private String targetMasked;
    private String templateCode;
    private String userSegment;
    private Map<String, String> variables;

    public String getChannel() {
        return this.channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getCountryCode() {
        return this.countryCode;
    }

    public void setCountryCode(String countryCode) {
        this.countryCode = countryCode;
    }

    public String getDeliveryPurpose() {
        return this.deliveryPurpose;
    }

    public void setDeliveryPurpose(String deliveryPurpose) {
        this.deliveryPurpose = deliveryPurpose;
    }

    public Boolean getDryRun() {
        return this.dryRun;
    }

    public void setDryRun(Boolean dryRun) {
        this.dryRun = dryRun;
    }

    public String getLocale() {
        return this.locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }

    public String getSceneCode() {
        return this.sceneCode;
    }

    public void setSceneCode(String sceneCode) {
        this.sceneCode = sceneCode;
    }

    public String getTargetHash() {
        return this.targetHash;
    }

    public void setTargetHash(String targetHash) {
        this.targetHash = targetHash;
    }

    public String getTargetMasked() {
        return this.targetMasked;
    }

    public void setTargetMasked(String targetMasked) {
        this.targetMasked = targetMasked;
    }

    public String getTemplateCode() {
        return this.templateCode;
    }

    public void setTemplateCode(String templateCode) {
        this.templateCode = templateCode;
    }

    public String getUserSegment() {
        return this.userSegment;
    }

    public void setUserSegment(String userSegment) {
        this.userSegment = userSegment;
    }

    public Map<String, String> getVariables() {
        return this.variables;
    }

    public void setVariables(Map<String, String> variables) {
        this.variables = variables;
    }
}
