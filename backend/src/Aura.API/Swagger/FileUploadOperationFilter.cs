using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Linq;
using System.Reflection;

namespace Aura.API.Swagger;

public class FileUploadOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var formFileParameters = context.MethodInfo.GetParameters()
            .Where(p => p.ParameterType == typeof(IFormFile) || 
                       p.ParameterType == typeof(List<IFormFile>))
            .ToList();

        if (!formFileParameters.Any())
            return;

        // Remove existing schema properties that represent IFormFile
        if (operation.RequestBody?.Content != null)
        {
            foreach (var content in operation.RequestBody.Content)
            {
                if (content.Key == "multipart/form-data" && content.Value.Schema != null)
                {
                    // Remove IFormFile properties from schema
                    var propertiesToRemove = content.Value.Schema.Properties?
                        .Where(p => p.Key.Contains("ContentType") || 
                                   p.Key.Contains("ContentDisposition") ||
                                   p.Key.Contains("Headers") ||
                                   p.Key.Contains("Length") ||
                                   p.Key.Contains("Name") ||
                                   p.Key.Contains("FileName"))
                        .Select(p => p.Key)
                        .ToList();

                    if (propertiesToRemove != null && propertiesToRemove.Any())
                    {
                        foreach (var prop in propertiesToRemove)
                        {
                            content.Value.Schema.Properties?.Remove(prop);
                        }
                    }

                    // Add file parameter
                    foreach (var param in formFileParameters)
                    {
                        var fromFormAttr = param.GetCustomAttributes(typeof(FromFormAttribute), false)
                            .Cast<FromFormAttribute>()
                            .FirstOrDefault();
                        var paramName = fromFormAttr?.Name ?? param.Name;

                        if (param.ParameterType == typeof(IFormFile))
                        {
                            content.Value.Schema.Properties ??= new Dictionary<string, OpenApiSchema>();
                            content.Value.Schema.Properties[paramName] = new OpenApiSchema
                            {
                                Type = "string",
                                Format = "binary",
                                Description = "File to upload"
                            };
                        }
                        else if (param.ParameterType == typeof(List<IFormFile>))
                        {
                            content.Value.Schema.Properties ??= new Dictionary<string, OpenApiSchema>();
                            content.Value.Schema.Properties[paramName] = new OpenApiSchema
                            {
                                Type = "array",
                                Items = new OpenApiSchema
                                {
                                    Type = "string",
                                    Format = "binary"
                                },
                                Description = "Files to upload"
                            };
                        }
                    }
                }
            }
        }
    }
}
