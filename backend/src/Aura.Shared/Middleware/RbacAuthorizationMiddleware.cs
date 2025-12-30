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
            context.Request.Path.StartsWithSegments("/api/auth/register") ||
            context.Request.Path.StartsWithSegments("/api/admin/auth/login"))
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

        // Check if this is an admin user (from JWT token)
        var accountType = context.User?.FindFirst("account_type")?.Value;
        var isAdmin = accountType == "admin" || 
                     context.User?.IsInRole("Admin") == true || 
                     context.User?.IsInRole("SuperAdmin") == true;

        if (isAdmin)
        {
            // For admin users, preserve existing roles from JWT token
            // and only load additional permissions from database if needed
            var existingRoles = context.User?.FindAll(ClaimTypes.Role)
                .Select(c => c.Value)
                .ToList() ?? new List<string>();

            context.Items["UserRoles"] = existingRoles;
            
            // Try to get permissions from database, but don't fail if admin doesn't have entries in user_roles
            try
            {
                var permissions = await roleService.GetUserPermissionsAsync(userId);
                context.Items["UserPermissions"] = permissions.ToList();
                
                // Add permissions as claims
                if (context.User?.Identity is ClaimsIdentity claimsIdentity)
                {
                    foreach (var permission in permissions)
                    {
                        if (!context.User.HasClaim("Permission", permission))
                        {
                            claimsIdentity.AddClaim(new Claim("Permission", permission));
                        }
                    }
                }
            }
            catch
            {
                // If admin doesn't have entries in user_roles table, that's okay
                // They still have roles from JWT token
                context.Items["UserPermissions"] = new List<string>();
            }
        }
        else
        {
            // For regular users, load roles and permissions from database
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
                
                foreach (var permission in permissions)
                {
                    if (!context.User.HasClaim("Permission", permission))
                    {
                        claimsIdentity.AddClaim(new Claim("Permission", permission));
                    }
                }
            }
        }

        await _next(context);
    }
}

