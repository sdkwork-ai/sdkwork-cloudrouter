using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiChatCompletion
    {
        public List<OpenAiChatCompletionChoice>? Choices { get; set; }
        public int? Created { get; set; }
        public string? Id { get; set; }
        public string? Model { get; set; }
        public string? Object { get; set; }
        public string? RequestId { get; set; }
        public string? ServiceTier { get; set; }
        public string? SystemFingerprint { get; set; }
        public OpenAiTokenUsage? Usage { get; set; }
    }
}
