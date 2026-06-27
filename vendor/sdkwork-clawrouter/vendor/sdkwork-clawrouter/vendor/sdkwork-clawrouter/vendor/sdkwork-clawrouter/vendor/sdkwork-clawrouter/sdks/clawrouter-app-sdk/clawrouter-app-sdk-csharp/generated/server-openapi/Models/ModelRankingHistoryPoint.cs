using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ModelRankingHistoryPoint
    {
        public string Date { get; set; }
        public List<ModelRankingHistoryEntry> Entries { get; set; }
        public string Index { get; set; }
    }
}
