using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MinimaxFileRetrieveResponse
    {
        public MinimaxBaseResp? BaseResp { get; set; }
        public Dictionary<string, string>? File { get; set; }
    }
}
