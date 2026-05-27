# Progress Detail: 02-upgrade-all

## Changes Made

### Project Files — TFM updated to net10.0
- `HaywireGM.Server/HaywireGM.Server.csproj`
- `HaywireGM.AppHost/HaywireGM.AppHost.csproj` (also updated Aspire.AppHost.Sdk to 13.3.5)
- `HaywireGM.Business/HaywireGM.Business.csproj`
- `HaywireGM.Contracts/HaywireGM.Contracts.csproj`
- `HaywireGM.Data/HaywireGM.Data.csproj`
- `HaywireGM.ServiceDefaults/HaywireGM.ServiceDefaults.csproj`
- `HaywireGM.Business.UnitTests/HaywireGM.Business.UnitTests.csproj`
- `HaywireGM.Business.ComponentTests/HaywireGM.Business.ComponentTests.csproj`

### Package Updates
| Package | Old | New |
|---------|-----|-----|
| Microsoft.AspNetCore.Authentication.JwtBearer | 9.0.3 | 10.0.8 |
| Microsoft.Extensions.ApiDescription.Client | 9.0.3 | 10.0.8 |
| Microsoft.VisualStudio.Azure.Containers.Tools.Targets | 1.21.2 | **removed** (incompatible, no net10 version) |
| Newtonsoft.Json | 13.0.3 | 13.0.4 |
| Npgsql | 9.0.3/9.0.2 | 10.0.3 |
| Swashbuckle.AspNetCore | 8.0.0 | 10.1.7 |
| System.Configuration.ConfigurationManager | 9.0.3 | 10.0.8 |
| Microsoft.EntityFrameworkCore | 9.0.2 | 10.0.8 |
| Microsoft.Extensions.Configuration.Abstractions | 9.0.0 | 10.0.8 |
| Microsoft.Extensions.Logging.Abstractions | 9.0.10/10.0.2 | 10.0.8 |
| Aspire.Hosting.NodeJS | 9.1.0 | 9.5.2 |
| Aspire.Hosting.PostgreSQL | 9.1.0 | 13.3.5 |
| Microsoft.Extensions.Http.Resilience | 10.1.0 | 10.6.0 |
| Microsoft.Extensions.ServiceDiscovery | 10.1.0 | 10.6.0 |
| OpenTelemetry.* packages | 1.14.x | 1.15.x |

### Code Fixes — HaywireGM.Server/Program.cs
- `using Microsoft.OpenApi.Models` → `using Microsoft.OpenApi` (all types moved to root namespace in OpenApi 2.x)
- `c.AddSecurityRequirement(new OpenApiSecurityRequirement {...})` → `c.AddSecurityRequirement(_ => new OpenApiSecurityRequirement {...})` (Swashbuckle 10 signature change)
- `new OpenApiSecurityScheme { Reference = new OpenApiReference { ... } }` → `new OpenApiSecuritySchemeReference("Bearer")` (OpenApi 2.x removed Reference property)

## Build Results
✅ Full solution build: 0 errors

## Issues Encountered
- `Microsoft.OpenApi` 2.x (used by Swashbuckle 10) moved all types from `Microsoft.OpenApi.Models` to `Microsoft.OpenApi` namespace — updated using directive
- `OpenApiSecurityScheme.Reference` was removed in OpenApi 2.x — replaced with `OpenApiSecuritySchemeReference`
- `AddSecurityRequirement` in Swashbuckle 10 now takes `Func<OpenApiDocument, OpenApiSecurityRequirement>` — updated call site
