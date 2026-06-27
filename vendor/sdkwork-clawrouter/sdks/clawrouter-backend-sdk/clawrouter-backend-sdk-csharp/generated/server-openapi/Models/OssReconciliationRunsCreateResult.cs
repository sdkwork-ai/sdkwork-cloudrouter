using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class OssReconciliationRunsCreateResult
    {
        public string Code { get; set; }
        public StorageReconciliationRunMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
