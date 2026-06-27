package com.sdkwork.clawrouter.backend.model;

import java.util.List;
import java.util.Map;

public class MessagingRouteRuleCreateRequest {
    private String channel;
    private String countryCode;
    private String deliveryPurpose;
    private Map<String, String> failoverPolicy;
    private String locale;
    private Integer priority;
    private String ruleCode;
    private String sceneCode;
    private List<Map<String, Object>> targets;
    private String userSegment;

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

    public Map<String, String> getFailoverPolicy() {
        return this.failoverPolicy;
    }

    public void setFailoverPolicy(Map<String, String> failoverPolicy) {
        this.failoverPolicy = failoverPolicy;
    }

    public String getLocale() {
        return this.locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }

    public Integer getPriority() {
        return this.priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public String getRuleCode() {
        return this.ruleCode;
    }

    public void setRuleCode(String ruleCode) {
        this.ruleCode = ruleCode;
    }

    public String getSceneCode() {
        return this.sceneCode;
    }

    public void setSceneCode(String sceneCode) {
        this.sceneCode = sceneCode;
    }

    public List<Map<String, Object>> getTargets() {
        return this.targets;
    }

    public void setTargets(List<Map<String, Object>> targets) {
        this.targets = targets;
    }

    public String getUserSegment() {
        return this.userSegment;
    }

    public void setUserSegment(String userSegment) {
        this.userSegment = userSegment;
    }
}
