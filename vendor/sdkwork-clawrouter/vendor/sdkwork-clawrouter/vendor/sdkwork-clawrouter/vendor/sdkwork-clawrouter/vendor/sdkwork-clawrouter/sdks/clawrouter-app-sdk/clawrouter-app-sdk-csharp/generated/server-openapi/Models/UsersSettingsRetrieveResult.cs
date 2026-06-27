using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class UsersSettingsRetrieveResult
    {
        public string Code { get; set; }
        public SettingsDataResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
