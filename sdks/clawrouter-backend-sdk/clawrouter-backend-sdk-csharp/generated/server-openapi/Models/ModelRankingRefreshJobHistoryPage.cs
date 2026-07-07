using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelRankingRefreshJobHistoryPage
    {
        public List<Dictionary<string, string>> Items { get; set; }
        public PageInfo PageInfo { get; set; }
    }
}
