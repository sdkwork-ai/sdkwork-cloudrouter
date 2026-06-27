using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class InstallationStatusRetrieveResult
    {
        public string Code { get; set; }
        public InstallationStatusResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
