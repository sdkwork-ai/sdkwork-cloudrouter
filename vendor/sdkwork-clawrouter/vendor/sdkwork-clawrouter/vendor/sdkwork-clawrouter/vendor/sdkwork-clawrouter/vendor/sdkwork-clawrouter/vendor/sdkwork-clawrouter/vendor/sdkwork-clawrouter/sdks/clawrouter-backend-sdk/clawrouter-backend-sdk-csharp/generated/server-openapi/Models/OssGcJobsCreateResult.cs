using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class OssGcJobsCreateResult
    {
        public string Code { get; set; }
        public StorageGarbageCollectionJobMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
