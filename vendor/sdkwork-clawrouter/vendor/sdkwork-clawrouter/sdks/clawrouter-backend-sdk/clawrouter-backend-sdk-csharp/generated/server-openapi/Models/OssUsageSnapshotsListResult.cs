using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class OssUsageSnapshotsListResult
    {
        public string Code { get; set; }
        public StorageUsageSnapshotListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
