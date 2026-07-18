using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiRealtimeClientSecret
    {
        public OpenAiRealtimeClientSecretValue ClientSecret { get; set; }
        public string? Session { get; set; }
    }
}
