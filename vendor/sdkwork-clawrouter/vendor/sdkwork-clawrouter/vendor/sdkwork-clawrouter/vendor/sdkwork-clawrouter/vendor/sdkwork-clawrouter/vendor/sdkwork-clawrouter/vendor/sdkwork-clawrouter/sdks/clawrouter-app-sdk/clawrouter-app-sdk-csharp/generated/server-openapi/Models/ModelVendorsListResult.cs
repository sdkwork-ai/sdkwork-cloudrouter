using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ModelVendorsListResult
    {
        public string Code { get; set; }
        public RankingVendorOptionsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
