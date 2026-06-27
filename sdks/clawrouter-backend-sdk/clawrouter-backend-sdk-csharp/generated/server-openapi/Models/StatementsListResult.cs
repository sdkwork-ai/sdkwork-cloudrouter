using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StatementsListResult
    {
        public string Code { get; set; }
        public ServiceProviderCollectionResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
