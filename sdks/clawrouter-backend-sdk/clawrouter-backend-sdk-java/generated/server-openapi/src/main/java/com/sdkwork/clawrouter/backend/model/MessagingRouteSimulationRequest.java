package com.sdkwork.clawrouter.backend.model;


public class MessagingRouteSimulationRequest {
    private String channel;
    private String countryCode;
    private String deliveryPurpose;
    private String locale;
    private String sceneCode;
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

    public String getUserSegment() {
        return this.userSegment;
    }

    public void setUserSegment(String userSegment) {
        this.userSegment = userSegment;
    }
}
