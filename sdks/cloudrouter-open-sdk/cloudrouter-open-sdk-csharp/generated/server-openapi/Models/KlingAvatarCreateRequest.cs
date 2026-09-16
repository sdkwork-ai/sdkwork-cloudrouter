using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class KlingAvatarCreateRequest
    {
        public string? ModelName { get; set; }
        public string HumanImage { get; set; }
        public string? Prompt { get; set; }
        public string? VoiceMode { get; set; }
        public string? AudioUrl { get; set; }
        public string? Text { get; set; }
        public string? VoiceId { get; set; }
        public string? VoiceLanguage { get; set; }
        public string? CallbackUrl { get; set; }
    }
}
