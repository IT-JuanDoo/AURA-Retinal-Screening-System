# =============================================================================
# AURA Backend - ASP.NET Core 8.0 API
# Multi-stage build for optimized production image
# =============================================================================

# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files first (for layer caching)
COPY Aura.sln ./
COPY src/Aura.API/Aura.API.csproj src/Aura.API/
COPY src/Aura.Application/Aura.Application.csproj src/Aura.Application/
COPY src/Aura.Core/Aura.Core.csproj src/Aura.Core/
COPY src/Aura.Infrastructure/Aura.Infrastructure.csproj src/Aura.Infrastructure/
COPY src/Aura.Shared/Aura.Shared.csproj src/Aura.Shared/

# Restore dependencies
RUN dotnet restore

# Copy all source code
COPY src/ src/

# Build the application
WORKDIR /src/src/Aura.API
RUN dotnet build -c Release -o /app/build

# Stage 2: Publish
FROM build AS publish
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser

# Copy published files
COPY --from=publish /app/publish .

# Set ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Environment variables
ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Entry point
ENTRYPOINT ["dotnet", "Aura.API.dll"]

