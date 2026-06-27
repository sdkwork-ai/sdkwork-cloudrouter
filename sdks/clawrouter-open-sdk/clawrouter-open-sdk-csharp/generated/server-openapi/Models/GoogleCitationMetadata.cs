using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleCitationMetadata
    {
        public List<GoogleCitationSource>? CitationSources { get; set; }
    }
}
