using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiCertificateActivationRequest
    {
        public List<string>? CertificateIds { get; set; }
    }
}
