using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiRealtimeTranslationSession
    {
        public OpenAiRealtimeClientSecretValue? ClientSecret { get; set; }
        public string? Id { get; set; }
        public string? Object { get; set; }
        public string? SourceLanguage { get; set; }
        public string? TargetLanguage { get; set; }
    }
}
