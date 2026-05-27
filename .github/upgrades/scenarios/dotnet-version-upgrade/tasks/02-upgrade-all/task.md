# 02-upgrade-all: Upgrade all projects to net10.0 and update packages

Update TargetFramework to net10.0 in all 9 project files. Update all NuGet package references to their latest compatible versions. Fix any compilation errors from source-incompatible APIs (primarily in HaywireGM.Server and HaywireGM.Business). Resolve the one incompatible package in HaywireGM.Server and replace deprecated packages.

Key concerns:
- `HaywireGM.Server` has binary-incompatible API, source-incompatible APIs, and one incompatible NuGet package — highest risk project
- `HaywireGM.Business` has source-incompatible API usage
- `HaywireGM.Business.UnitTests` has behavioral change APIs to review
- `HaywireGM.React` targets net472 (JS/esproj) — update the Aspire launch profile only, not the framework

**Done when**: All projects target net10.0 (or equivalent for esproj), solution builds with 0 errors, all package references updated.
