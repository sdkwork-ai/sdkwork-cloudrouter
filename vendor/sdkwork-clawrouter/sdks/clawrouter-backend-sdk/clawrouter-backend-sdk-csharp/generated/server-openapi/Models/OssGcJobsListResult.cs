using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class OssGcJobsListResult
    {
        public string Code { get; set; }
        public StorageGarbageCollectionJobListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
