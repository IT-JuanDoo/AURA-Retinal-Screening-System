using Hangfire.Dashboard;
using Microsoft.Extensions.Configuration;

namespace Aura.API.Hangfire;

/// <summary>
/// Hangfire Dashboard Authorization Filter
/// Allows access in Development or Production if enabled
/// </summary>
public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        // Allow access if Hangfire dashboard is enabled (via config)
        var httpContext = context.GetHttpContext();
        var environment = httpContext.RequestServices.GetRequiredService<IWebHostEnvironment>();
        var configuration = httpContext.RequestServices.GetRequiredService<IConfiguration>();
        
        // If explicitly enabled in config, allow access (even in Production)
        var isDashboardEnabled = configuration.GetValue<bool>("Hangfire:EnableDashboard", false);
        if (isDashboardEnabled)
        {
            // In Production, allow access if enabled (for testing/monitoring)
            return true;
        }
        
        // In Development, always allow
        if (environment.IsDevelopment())
        {
            return true;
        }

        // For production without explicit enable, require authentication and admin role
        if (httpContext.User?.Identity?.IsAuthenticated == true)
        {
            return httpContext.User.IsInRole("Admin") || httpContext.User.IsInRole("SuperAdmin");
        }

        return false;
    }
}
