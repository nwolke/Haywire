# Scenario Instructions: .NET Version Upgrade

## Parameters

- **Solution**: `HaywireGM.sln`
- **Target Framework**: `net10.0`
- **Source Branch**: `copilot/gm-174-general-rename-to-haywiregm`
- **Working Branch**: `upgrade-to-NET10`

## Preferences

### Flow Mode
**Automatic** — Run end-to-end, only pause when blocked or needing user input.

## User Preferences

### Technical Preferences
- Upgrade all projects to net10.0
- Update all NuGet packages to latest versions

## Strategy
**Selected**: All-At-Once
**Rationale**: 9 projects, all on net9.0, manageable dependency graph.

### Execution Constraints
- Single atomic upgrade — all projects updated together
- Validate full solution build after upgrade before running tests
- Fix all compilation errors in one bounded pass (no retry loops)
- Tests run only after successful build

## Preferences

### Commit Strategy
After Each Task

## Key Decisions Log
- 2025-01-01: User confirmed upgrade to net10.0 with package updates, Automatic flow mode
