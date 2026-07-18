using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiCompletion
    {
        public List<CreateCompletionChoice> Choices { get; set; }
        public int Created { get; set; }
        public string Id { get; set; }
        public string Model { get; set; }
        public string Object { get; set; }
        public string? SystemFingerprint { get; set; }
        public OpenAiTokenUsage? Usage { get; set; }
    }
}
