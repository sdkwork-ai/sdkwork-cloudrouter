using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiErrorEnvelope
    {
        public OpenAiError Error { get; set; }
    }
}
