using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class InvocationsRetrieveResult
    {
        public string Code { get; set; }
        public RuntimeInvocationItem? Data { get; set; }
        public string? Msg { get; set; }
    }
}
