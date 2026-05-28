# .NET Version Upgrade Plan

## Overview

**Target**: Upgrade all 9 projects from net9.0 to net10.0 and update all NuGet packages to latest versions.
**Scope**: 9 projects — 3 class libraries, 1 ASP.NET Core app, 2 test projects, 1 component test project, 1 AppHost (Aspire), 1 ServiceDefaults.

### Selected Strategy
**All-At-Once** — All projects upgraded simultaneously in a single operation.
**Rationale**: 9 projects, all on net9.0, dependency graph is 4 levels deep but manageable. Main work is TFM bumps, package updates, and fixing source-incompatible APIs in HaywireGM.Server and HaywireGM.Business.

---

## Tasks

### 01-prereqs: Validate .NET 10 SDK and global.json

Check that the .NET 10 SDK is installed and any global.json files are compatible with net10.0. Update global.json if needed.

**Done when**: .NET 10 SDK confirmed installed; global.json (if present) allows net10.0 tooling.

---

### 02-upgrade-all: Upgrade all projects to net10.0 and update packages

Update TargetFramework to net10.0 in all 9 project files. Update all NuGet package references to their latest compatible versions. Fix any compilation errors from source-incompatible APIs (primarily in HaywireGM.Server and HaywireGM.Business). Resolve the one incompatible package in HaywireGM.Server and replace deprecated packages.

Key concerns:
- `HaywireGM.Server` has binary-incompatible API, source-incompatible APIs, and one incompatible NuGet package — highest risk project
- `HaywireGM.Business` has source-incompatible API usage
- `HaywireGM.Business.UnitTests` has behavioral change APIs to review
- `HaywireGM.React` targets net472 (JS/esproj) — update the Aspire launch profile only, not the framework

**Done when**: All projects target net10.0 (or equivalent for esproj), solution builds with 0 errors, all package references updated.

---

### 03-tests: Run tests and validate

Run all tests (unit and component tests). Review any behavioral change warnings found during upgrade (Api.0003) and confirm expected behavior is preserved.

**Done when**: All tests pass; behavioral changes reviewed and addressed.

---
