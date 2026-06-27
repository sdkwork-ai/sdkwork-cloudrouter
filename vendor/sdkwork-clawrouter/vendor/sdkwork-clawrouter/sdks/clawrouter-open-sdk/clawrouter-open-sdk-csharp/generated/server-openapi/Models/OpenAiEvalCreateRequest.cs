using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiEvalCreateRequest
    {
        public string? DataSource { get; set; }
        public string? DataSourceConfig { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Name { get; set; }
        public List<string>? TestingCriteria { get; set; }
    }
}
