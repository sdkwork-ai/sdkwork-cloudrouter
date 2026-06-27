using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiEvalRunOutputItem
    {
        public int? CreatedAt { get; set; }
        public string? EvalId { get; set; }
        public string? Id { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Object { get; set; }
        public List<string>? Results { get; set; }
        public string? RunId { get; set; }
        public string? Sample { get; set; }
        public string? Status { get; set; }
    }
}
