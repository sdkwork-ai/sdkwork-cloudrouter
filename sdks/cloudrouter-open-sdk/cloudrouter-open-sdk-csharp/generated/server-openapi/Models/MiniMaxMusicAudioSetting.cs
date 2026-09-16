using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MiniMaxMusicAudioSetting
    {
        public int? SampleRate { get; set; }
        public int? Bitrate { get; set; }
        public string? Format { get; set; }
    }
}
