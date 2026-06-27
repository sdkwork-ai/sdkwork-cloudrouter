using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelRankingRefreshJobHistoryPage
    {
        public List<ModelRankingRefreshJobItem> Items { get; set; }
    }
}
