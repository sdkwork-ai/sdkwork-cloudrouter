using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class PriceSimulationCreateResult
    {
        public string Code { get; set; }
        public ServiceProviderPriceSimulationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
