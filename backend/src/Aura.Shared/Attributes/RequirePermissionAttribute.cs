using Microsoft.AspNetCore.Authorization;

namespace Aura.Shared.Attributes;

public class RequirePermissionAttribute : AuthorizeAttribute
{
    public RequirePermissionAttribute(string permission) : base(permission)
    {
        Policy = permission;
    }
}

