using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ModelCatalogPage
    {
        public List<Dictionary<string, object>> Groups { get; set; }
        public List<Dictionary<string, string>> Items { get; set; }
        public PageInfo PageInfo { get; set; }
    }
}
