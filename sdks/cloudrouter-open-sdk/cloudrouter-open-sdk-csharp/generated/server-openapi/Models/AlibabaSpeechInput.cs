using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AlibabaSpeechInput
    {
        public string? Instructions { get; set; }
        public string? LanguageType { get; set; }
        public bool? OptimizeInstructions { get; set; }
        public string Text { get; set; }
        public string Voice { get; set; }
    }
}
