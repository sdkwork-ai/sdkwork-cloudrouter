using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelRankingsSnapshot
    {
        public List<ModelRankingHistoryPoint> History { get; set; }
        public List<ModelRankingItem> Items { get; set; }
        public ModelRankingsSource Source { get; set; }
    }
}
