package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class GooglePromptFeedback {
    private String blockReason;
    private List<GoogleSafetyRating> safetyRatings;

    public String getBlockReason() {
        return this.blockReason;
    }

    public void setBlockReason(String blockReason) {
        this.blockReason = blockReason;
    }

    public List<GoogleSafetyRating> getSafetyRatings() {
        return this.safetyRatings;
    }

    public void setSafetyRatings(List<GoogleSafetyRating> safetyRatings) {
        this.safetyRatings = safetyRatings;
    }
}
