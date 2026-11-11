using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class KlingSoundGenerationRequest
    {
        public string? CallbackUrl { get; set; }
        public double Duration { get; set; }
        public string? ExternalTaskId { get; set; }
        public string Prompt { get; set; }
    }
}
