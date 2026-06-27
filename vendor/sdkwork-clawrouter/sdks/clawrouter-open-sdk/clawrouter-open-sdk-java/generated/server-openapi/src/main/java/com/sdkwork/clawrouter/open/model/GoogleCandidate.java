package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class GoogleCandidate {
    private GoogleCitationMetadata citationMetadata;
    private GoogleContent content;
    private String finishReason;
    private Integer index;
    private List<GoogleSafetyRating> safetyRatings;
    private Integer tokenCount;

    public GoogleCitationMetadata getCitationMetadata() {
        return this.citationMetadata;
    }

    public void setCitationMetadata(GoogleCitationMetadata citationMetadata) {
        this.citationMetadata = citationMetadata;
    }

    public GoogleContent getContent() {
        return this.content;
    }

    public void setContent(GoogleContent content) {
        this.content = content;
    }

    public String getFinishReason() {
        return this.finishReason;
    }

    public void setFinishReason(String finishReason) {
        this.finishReason = finishReason;
    }

    public Integer getIndex() {
        return this.index;
    }

    public void setIndex(Integer index) {
        this.index = index;
    }

    public List<GoogleSafetyRating> getSafetyRatings() {
        return this.safetyRatings;
    }

    public void setSafetyRatings(List<GoogleSafetyRating> safetyRatings) {
        this.safetyRatings = safetyRatings;
    }

    public Integer getTokenCount() {
        return this.tokenCount;
    }

    public void setTokenCount(Integer tokenCount) {
        this.tokenCount = tokenCount;
    }
}
