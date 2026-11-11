package com.sdkwork.cloudrouter.open.model;


public class OpenAiDeepSeekWebSearchRequest {
    private Integer count;
    private String localization;
    private Boolean needContent;
    private String oriQuestion;
    private String query;

    public Integer getCount() {
        return this.count;
    }

    public void setCount(Integer count) {
        this.count = count;
    }

    public String getLocalization() {
        return this.localization;
    }

    public void setLocalization(String localization) {
        this.localization = localization;
    }

    public Boolean getNeedContent() {
        return this.needContent;
    }

    public void setNeedContent(Boolean needContent) {
        this.needContent = needContent;
    }

    public String getOriQuestion() {
        return this.oriQuestion;
    }

    public void setOriQuestion(String oriQuestion) {
        this.oriQuestion = oriQuestion;
    }

    public String getQuery() {
        return this.query;
    }

    public void setQuery(String query) {
        this.query = query;
    }
}
