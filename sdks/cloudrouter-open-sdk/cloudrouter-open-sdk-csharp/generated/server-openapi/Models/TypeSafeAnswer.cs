using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class TypeSafeAnswer
    {
        public string? Choice { get; set; }
        public double? Confidence { get; set; }
        public Dictionary<string, string>? Legend { get; set; }
        public double? Noul { get; set; }
        public Dictionary<string, double>? Probabilities { get; set; }
        public double? Score { get; set; }
        public string Type { get; set; }
    }
}
