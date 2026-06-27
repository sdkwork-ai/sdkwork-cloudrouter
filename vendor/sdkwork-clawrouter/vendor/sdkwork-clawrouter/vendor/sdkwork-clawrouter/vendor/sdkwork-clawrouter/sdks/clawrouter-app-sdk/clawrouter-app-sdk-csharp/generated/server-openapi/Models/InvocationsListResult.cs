using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class InvocationsListResult
    {
        public string Code { get; set; }
        public RuntimeInvocationListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
