using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiVectorStoreSearchRequest
    {
        public string? Filters { get; set; }
        public int? MaxNumResults { get; set; }
        public string Query { get; set; }
        public string? RankingOptions { get; set; }
        public bool? RewriteQuery { get; set; }
    }
}
