package com.sdkwork.clawrouter.backend.model;

import java.util.Map;

public class MessagingTemplateCreateRequest {
    private String bodyTemplate;
    private String category;
    private String channel;
    private String contentFormat;
    private String deliveryPurpose;
    private String locale;
    private String sceneCode;
    private String subjectTemplate;
    private String templateCode;
    private String templateName;
    private Map<String, String> variableSchema;

    public String getBodyTemplate() {
        return this.bodyTemplate;
    }

    public void setBodyTemplate(String bodyTemplate) {
        this.bodyTemplate = bodyTemplate;
    }

    public String getCategory() {
        return this.category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getChannel() {
        return this.channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getContentFormat() {
        return this.contentFormat;
    }

    public void setContentFormat(String contentFormat) {
        this.contentFormat = contentFormat;
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

    public String getSubjectTemplate() {
        return this.subjectTemplate;
    }

    public void setSubjectTemplate(String subjectTemplate) {
        this.subjectTemplate = subjectTemplate;
    }

    public String getTemplateCode() {
        return this.templateCode;
    }

    public void setTemplateCode(String templateCode) {
        this.templateCode = templateCode;
    }

    public String getTemplateName() {
        return this.templateName;
    }

    public void setTemplateName(String templateName) {
        this.templateName = templateName;
    }

    public Map<String, String> getVariableSchema() {
        return this.variableSchema;
    }

    public void setVariableSchema(Map<String, String> variableSchema) {
        this.variableSchema = variableSchema;
    }
}
