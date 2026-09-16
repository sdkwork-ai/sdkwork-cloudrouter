using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MiniMaxMusicData
    {
        public string? Audio { get; set; }
        public MiniMaxMusicExtraInfo? ExtraInfo { get; set; }
        public int? Status { get; set; }
    }
}
