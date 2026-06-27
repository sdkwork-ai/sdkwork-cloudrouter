using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAnalyticsTrendPoint
    {
        public double Points { get; set; }
        public double Requests { get; set; }
        public string Time { get; set; }
        public double Tokens { get; set; }
        public string Users { get; set; }
    }
}
