using System.Security.Claims;
using Aura.Application.Services.RBAC;
using Microsoft.AspNetCore.Http;

namespace Aura.Shared.Middleware;

public class RbacAuthorizationMiddleware
{
    private readonly RequestDelegate _next;

    public RbacAuthorizationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IRoleService roleService)
    {
        // Skip authorization for public endpoints
        if (context.Request.Path.StartsWithSegments("/health") ||
            context.Request.Path.StartsWithSegments("/swagger") ||
            context.Request.Path.StartsWithSegments("/api/auth/login") ||
            context.Request.Path.StartsWithSegments("/api/auth/register"))
        {
            await _next(context);
            return;
        }

        var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            await _next(context);
            return;
        }

        // Get user roles and permissions and add to context
        var roles = await roleService.GetUserRolesAsync(userId);
        var permissions = await roleService.GetUserPermissionsAsync(userId);

        context.Items["UserRoles"] = roles.ToList();
        context.Items["UserPermissions"] = permissions.ToList();

        // Add roles and permissions as claims for authorization
        if (context.User?.Identity is ClaimsIdentity claimsIdentity)
        {
            foreach (var role in roles)
            {
                if (context.User != null && !context.User.HasClaim(ClaimTypes.Role, role))
                {
                    claimsIdentity.AddClaim(new Claim(ClaimTypes.Role, role));
                }
            }
        }

        await _next(context);
    }
}

