package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class ElevenLabsMusicPrompt {
    private List<String> negativeGlobalStyles;
    private List<String> positiveGlobalStyles;
    private List<Map<String, String>> sections;

    public List<String> getNegativeGlobalStyles() {
        return this.negativeGlobalStyles;
    }

    public void setNegativeGlobalStyles(List<String> negativeGlobalStyles) {
        this.negativeGlobalStyles = negativeGlobalStyles;
    }

    public List<String> getPositiveGlobalStyles() {
        return this.positiveGlobalStyles;
    }

    public void setPositiveGlobalStyles(List<String> positiveGlobalStyles) {
        this.positiveGlobalStyles = positiveGlobalStyles;
    }

    public List<Map<String, String>> getSections() {
        return this.sections;
    }

    public void setSections(List<Map<String, String>> sections) {
        this.sections = sections;
    }
}
