using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class UsageLogsResponse
    {
        public List<UsageLogItem> Logs { get; set; }
        public string Page { get; set; }
        public string PageSize { get; set; }
        public string Total { get; set; }
    }
}
