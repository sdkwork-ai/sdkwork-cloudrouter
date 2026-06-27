using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class DashboardChartPoint
    {
        public double AudioWhisper { get; set; }
        public double ImageMidjourneyDALLE { get; set; }
        public double LlmText { get; set; }
        public double MusicSuno { get; set; }
        public string Time { get; set; }
        public double VideoRunwaySora { get; set; }
    }
}
