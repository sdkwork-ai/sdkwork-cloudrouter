using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class OssUsageLedgerListResult
    {
        public string Code { get; set; }
        public StorageUsageLedgerListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
