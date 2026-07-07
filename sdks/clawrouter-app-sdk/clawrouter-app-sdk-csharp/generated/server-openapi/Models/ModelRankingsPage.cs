using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ModelRankingsPage
    {
        public List<Dictionary<string, string>> History { get; set; }
        public List<Dictionary<string, string>> Items { get; set; }
        public PageInfo PageInfo { get; set; }
        public Dictionary<string, string> Source { get; set; }
    }
}
