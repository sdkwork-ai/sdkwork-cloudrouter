using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MiniMaxMusicExtraInfo
    {
        public int? Bitrate { get; set; }
        public int? MusicChannel { get; set; }
        public double? MusicDuration { get; set; }
        public int? MusicSampleRate { get; set; }
        public int? MusicSize { get; set; }
    }
}
