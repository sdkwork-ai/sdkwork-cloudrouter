package com.sdkwork.clawrouter.open.model;


public class OpenAiVectorStoreSearchRequest {
    private String filters;
    private Integer maxNumResults;
    private String query;
    private String rankingOptions;
    private Boolean rewriteQuery;

    public String getFilters() {
        return this.filters;
    }

    public void setFilters(String filters) {
        this.filters = filters;
    }

    public Integer getMaxNumResults() {
        return this.maxNumResults;
    }

    public void setMaxNumResults(Integer maxNumResults) {
        this.maxNumResults = maxNumResults;
    }

    public String getQuery() {
        return this.query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public String getRankingOptions() {
        return this.rankingOptions;
    }

    public void setRankingOptions(String rankingOptions) {
        this.rankingOptions = rankingOptions;
    }

    public Boolean getRewriteQuery() {
        return this.rewriteQuery;
    }

    public void setRewriteQuery(Boolean rewriteQuery) {
        this.rewriteQuery = rewriteQuery;
    }
}
