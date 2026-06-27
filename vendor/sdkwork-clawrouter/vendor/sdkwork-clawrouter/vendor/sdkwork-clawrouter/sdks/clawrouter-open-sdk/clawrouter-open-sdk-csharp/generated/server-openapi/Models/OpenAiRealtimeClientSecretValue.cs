using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiRealtimeClientSecretValue
    {
        public int? ExpiresAt { get; set; }
        public string? Value { get; set; }
    }
}
