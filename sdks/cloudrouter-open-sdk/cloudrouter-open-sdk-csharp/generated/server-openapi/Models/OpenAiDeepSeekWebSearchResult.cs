using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiDeepSeekWebSearchResult
    {
        public int Authority { get; set; }
        public string Content { get; set; }
        public string Date { get; set; }
        public double RerankScore { get; set; }
        public string SiteIcon { get; set; }
        public string SiteName { get; set; }
        public string Snippet { get; set; }
        public string Summary { get; set; }
        public string Title { get; set; }
        public string Url { get; set; }
    }
}
