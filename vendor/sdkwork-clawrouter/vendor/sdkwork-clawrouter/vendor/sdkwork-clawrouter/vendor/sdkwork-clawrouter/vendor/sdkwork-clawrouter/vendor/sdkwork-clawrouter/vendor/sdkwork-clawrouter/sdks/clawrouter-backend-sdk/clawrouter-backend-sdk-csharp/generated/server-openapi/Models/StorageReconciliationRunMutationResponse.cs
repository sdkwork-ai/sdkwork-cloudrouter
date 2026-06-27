using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageReconciliationRunMutationResponse
    {
        public StorageReconciliationRun ReconciliationRun { get; set; }
        public string RequestId { get; set; }
    }
}
