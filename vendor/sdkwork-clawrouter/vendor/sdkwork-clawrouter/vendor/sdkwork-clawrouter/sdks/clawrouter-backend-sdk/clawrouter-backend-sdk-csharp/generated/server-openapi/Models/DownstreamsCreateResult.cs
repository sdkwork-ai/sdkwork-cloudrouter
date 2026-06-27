using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class DownstreamsCreateResult
    {
        public string Code { get; set; }
        public ServiceProviderDownstreamMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
