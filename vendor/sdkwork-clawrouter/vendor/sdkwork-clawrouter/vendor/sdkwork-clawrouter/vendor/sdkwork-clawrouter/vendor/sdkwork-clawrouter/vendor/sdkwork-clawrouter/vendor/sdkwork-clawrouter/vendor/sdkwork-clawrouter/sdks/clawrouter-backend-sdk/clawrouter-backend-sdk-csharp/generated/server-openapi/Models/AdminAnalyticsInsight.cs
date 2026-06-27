using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAnalyticsInsight
    {
        public string Detail { get; set; }
        public string Key { get; set; }
        public string Severity { get; set; }
        public string Title { get; set; }
        public string Value { get; set; }
    }
}
