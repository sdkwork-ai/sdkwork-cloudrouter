package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class GoogleCitationMetadata {
    private List<GoogleCitationSource> citationSources;

    public List<GoogleCitationSource> getCitationSources() {
        return this.citationSources;
    }

    public void setCitationSources(List<GoogleCitationSource> citationSources) {
        this.citationSources = citationSources;
    }
}
