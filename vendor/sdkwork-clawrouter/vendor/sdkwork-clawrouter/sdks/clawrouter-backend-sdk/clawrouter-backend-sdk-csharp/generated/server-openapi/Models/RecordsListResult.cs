using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class RecordsListResult
    {
        public string Code { get; set; }
        public AdminRecordLogsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
