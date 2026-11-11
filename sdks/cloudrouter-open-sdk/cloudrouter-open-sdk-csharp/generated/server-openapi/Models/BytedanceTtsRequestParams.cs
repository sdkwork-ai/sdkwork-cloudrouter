using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class BytedanceTtsRequestParams
    {
        public string? Additions { get; set; }
        public BytedanceTtsAudioParams AudioParams { get; set; }
        public string? Model { get; set; }
        public Dictionary<string, string>? PronunciationDict { get; set; }
        public string Speaker { get; set; }
        public string? Ssml { get; set; }
        public string Text { get; set; }
        public List<string>? Tone { get; set; }
    }
}
