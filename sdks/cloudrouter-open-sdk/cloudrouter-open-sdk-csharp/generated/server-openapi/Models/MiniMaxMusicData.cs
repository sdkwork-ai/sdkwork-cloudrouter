using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MiniMaxMusicData
    {
        public int? Status { get; set; }
        public string? Audio { get; set; }
        public MiniMaxMusicExtraInfo? ExtraInfo { get; set; }
    }
}
