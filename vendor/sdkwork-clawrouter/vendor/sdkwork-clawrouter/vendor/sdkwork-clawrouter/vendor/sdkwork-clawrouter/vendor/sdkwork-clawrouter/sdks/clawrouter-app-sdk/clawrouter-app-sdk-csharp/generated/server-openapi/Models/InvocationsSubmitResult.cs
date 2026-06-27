using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class InvocationsSubmitResult
    {
        public string Code { get; set; }
        public RuntimeInvocationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
