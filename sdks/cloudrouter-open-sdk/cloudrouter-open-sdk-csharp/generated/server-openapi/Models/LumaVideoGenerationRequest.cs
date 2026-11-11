using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class LumaVideoGenerationRequest
    {
        public string? AspectRatio { get; set; }
        public string? CallbackUrl { get; set; }
        public List<LumaConcept>? Concepts { get; set; }
        public string? Duration { get; set; }
        public string? GenerationType { get; set; }
        public LumaKeyframes? Keyframes { get; set; }
        public bool? Loop { get; set; }
        public string Model { get; set; }
        public string? Prompt { get; set; }
        public string? Resolution { get; set; }
    }
}
