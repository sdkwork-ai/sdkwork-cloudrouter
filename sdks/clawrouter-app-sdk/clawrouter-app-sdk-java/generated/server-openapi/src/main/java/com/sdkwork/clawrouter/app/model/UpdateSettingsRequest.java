package com.sdkwork.clawrouter.app.model;


public class UpdateSettingsRequest {
    private String language;
    private SettingsNotifications notifications;
    private String timezone;
    private String webhookUrl;

    public String getLanguage() {
        return this.language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public SettingsNotifications getNotifications() {
        return this.notifications;
    }

    public void setNotifications(SettingsNotifications notifications) {
        this.notifications = notifications;
    }

    public String getTimezone() {
        return this.timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public String getWebhookUrl() {
        return this.webhookUrl;
    }

    public void setWebhookUrl(String webhookUrl) {
        this.webhookUrl = webhookUrl;
    }
}
