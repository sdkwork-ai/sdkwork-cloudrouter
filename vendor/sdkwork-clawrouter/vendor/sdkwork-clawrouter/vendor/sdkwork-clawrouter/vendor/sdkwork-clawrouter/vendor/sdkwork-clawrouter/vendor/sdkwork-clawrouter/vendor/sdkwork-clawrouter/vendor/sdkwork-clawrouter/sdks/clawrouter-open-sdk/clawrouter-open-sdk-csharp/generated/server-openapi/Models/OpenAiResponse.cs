using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiResponse
    {
        public int? CreatedAt { get; set; }
        public OpenAiResponseError? Error { get; set; }
        public string? Id { get; set; }
        public OpenAiIncompleteDetails? IncompleteDetails { get; set; }
        public string? Model { get; set; }
        public string? Object { get; set; }
        public List<OpenAiResponseOutputItem>? Output { get; set; }
        public string? OutputText { get; set; }
        public string? Status { get; set; }
        public OpenAiResponseUsage? Usage { get; set; }
    }
}
