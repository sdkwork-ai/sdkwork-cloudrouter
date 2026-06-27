using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ModelRankingHistoryEntry
    {
        public string CatalogKey { get; set; }
        public string Color { get; set; }
        public string Model { get; set; }
        public string Rank { get; set; }
        public string Volume { get; set; }
    }
}
