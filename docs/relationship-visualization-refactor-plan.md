# Relationship Visualization Refactor Plan

## Purpose

Refactor HaywireGM's campaign relationship visualization into a scalable, low-clutter system for PCs, NPCs, and organizations. The target experience supports organization clusters, collapsible groups, membership badges, filters, semantic zoom, aggregated edges, and matrix and hierarchy views.

This plan is front-end focused. No backend changes are part of this work without separate approval.

## Current-state analysis

The current implementation is centered on `HaywireGM.React/src/app/pages/CampaignPage.tsx`. That page owns entity shaping, inferred organization membership, filters, selection, canvas sizing, CRUD wiring, and layout. `EntityGraph.tsx` directly converts raw entities and relationships into `react-force-graph-2d` data and draws all graph semantics on a canvas.

### Architectural and data issues

- Organization membership has two sources: explicit organization relationships and NPC `faction` text. The page creates synthetic organization nodes and `member` relationships from faction text.
- Organizations are loaded globally and then filtered indirectly. Valid organizations with no matching NPC faction or relationship can be omitted.
- `Relationship.npcId1` and `npcId2` contain IDs for NPCs, PCs, and organizations, despite their names.
- Relationship creation prevents a second relationship to an already-connected target, preventing multiple relationship types between the same pair.
- Graph transformations live in the page and renderer rather than in a reusable view-model layer.
- Relationship metadata—labels, colors, and categories—is duplicated across graph, detail, legend, manager, and analytics components.
- The force graph has no stable grouping, collapse, zoom-tier, or aggregate-edge model.

### UI and UX issues

- Membership edges compete visually with social relationships, creating graph clutter.
- The only filters are search and entity-type toggles; relationship type and perspective are unavailable.
- All nodes and edges render at all zoom levels.
- Parallel relationships render as overlapping edges.
- Canvas interaction is limited for keyboard users and information is overly dependent on color and hover.
- Analytics is the sole secondary view; there is no pairwise matrix or organization hierarchy.
- Existing tests only cover graph force settings and an organization label color.

## Refactor direction

Introduce a typed client-side visualization domain between API data and views. It will normalize entity references, determine canonical memberships, derive filters and aggregate edges, and expose reusable visualization state. The force graph becomes one renderer of a prepared view model rather than the place where domain semantics are decided.

## Phase 1 — Establish a relationship visualization domain

### Story 1.1 — Define canonical visualization types

Define typed entity keys, endpoint references, memberships, graph nodes, aggregated graph edges, filter state, zoom tiers, and view modes.

**Acceptance criteria**

- Entity identity uses `{ entityType, id }` or a canonical entity key.
- Relationship endpoints use neutral names such as `source` and `target`.
- Membership is distinguishable from a standard relationship.
- Aggregated edges retain IDs, types, descriptions, and attitudes of every underlying relationship.
- Existing API DTO transformations remain backward-compatible at the application boundary.

### Story 1.2 — Centralize relationship metadata

Create one registry for relationship labels, colors, icons, categories, directionality rules, and membership classification.

**Acceptance criteria**

- Graph, detail panel, legend, filters, matrix, and hierarchy share one metadata source.
- Membership has an explicit category and icon/badge treatment.
- Unknown types safely use a neutral fallback.
- No visualization component maintains a conflicting private color map.

### Story 1.3 — Create a campaign visualization selector layer

Extract pure selectors for campaign entities, memberships, visible entities, filtered relationships, aggregated edges, and per-view datasets.

**Acceptance criteria**

- Selectors are pure and unit-tested.
- `CampaignPage` no longer creates graph-specific synthetic data inline.
- Standard graph edges exclude membership by default.
- Membership badges are derived without duplicate network edges.
- Missing endpoint entities do not break rendering.

### Story 1.4 — Define membership precedence and migration behavior

Establish the client rule for explicit memberships and legacy NPC `faction` values.

**Acceptance criteria**

- Explicit membership takes precedence over matching faction text.
- Legacy faction-only membership is identified as inferred and read-only.
- A person is not duplicated in an organization when both sources match.
- Inferred membership cannot be edited or deleted as persisted data.
- Migration behavior is documented.

## Phase 2 — Decompose page state and add graph controls

### Story 2.1 — Extract visualization state

Move selection, filters, collapsed organization IDs, active view, and zoom tier out of `CampaignPage` into a dedicated visualization state module.

**Acceptance criteria**

- `CampaignPage` is reduced to data composition, layout, and modal wiring.
- State has typed actions.
- Clearing filters does not alter campaign data.
- Selection remains valid through filtering, zooming, and collapsing.
- Per-campaign browser persistence is possible without persisting transient force positions.

### Story 2.2 — Build an accessible filter panel

Replace the entity-type toggle strip with a reusable filter panel.

**Acceptance criteria**

- Filter by NPC, PC, and organization entity type.
- Filter by one or more relationship types.
- Filter by perspective: all, PC-centric, NPC-centric, or organization-centric.
- Optionally hide inferred memberships and isolated entities.
- Show active-filter count and a clear-all action.
- Controls are keyboard accessible and clearly labelled.

### Story 2.3 — Define shared loading and empty states

Provide consistent loading, empty, filtered-empty, and error states for graph, matrix, and hierarchy views.

**Acceptance criteria**

- Entity-only campaigns still show membership and entity context.
- Filtered-empty states identify the relevant filter condition.
- Errors do not erase available data.
- Every view has a reset or recovery path.

## Phase 3 — Rebuild the graph around visual hierarchy

### Story 3.1 — Introduce a typed graph adapter

Refactor `EntityGraph` into a graph shell receiving a prepared view model, with focused renderers for nodes, edges, clusters, and interactions.

**Acceptance criteria**

- Internal graph data is typed without `any`.
- Node, edge, tooltip, and interaction behavior is independently testable.
- Omitted filtered data does not break the graph.
- Existing node selection remains available.

### Story 3.2 — Add organization cluster containers

Draw soft, labelled bubbles around expanded organizations and their NPC members.

**Acceptance criteria**

- Expanded organizations have low-emphasis visual boundaries around visible members.
- Cluster labels show organization name and visible member count.
- Multi-organization members are represented once and display multiple badges.
- Boundaries update for filters, zoom, and collapse state.
- Non-members stay outside clusters.
- Cluster rendering does not block selection or labels.

### Story 3.3 — Add collapsible organizations

Let users collapse an organization into one summary node and expand it again.

**Acceptance criteria**

- Expanded groups show clusters and their visible members.
- Collapsed groups show an organization node with total and visible member counts.
- Collapse hides members without deleting data or unrelated nodes.
- Hidden-member social relationships are summarized only when meaningful.
- Expansion restores visibility and selection safely.
- Each organization tracks its own collapse state across views.

### Story 3.4 — Render membership as node badges

Remove membership from default graph edges and display organization membership as node badges/icons on NPC and PC nodes.

**Acceptance criteria**

- NPC-to-organization and PC-to-organization membership is not a standard graph edge.
- Badges summarize multiple memberships compactly.
- Hover and focus expose all memberships and their source.
- Membership remains visible in detail, matrix, and hierarchy views.
- Membership filters include members despite edge suppression.

### Story 3.5 — Aggregate parallel relationships into stacked edges

Represent all non-membership relationships between an entity pair as one edge with stacked relationship segments or badges.

**Acceptance criteria**

- A visible pair has one edge under the documented directionality rule.
- The edge communicates each underlying type without color-only encoding.
- Hover/focus exposes each relationship, description, and attitude.
- Individual underlying relationships remain editable in the detail panel.
- Type filters retain an aggregate edge when it contains a matching relationship.
- Aggregate attitude styling follows a documented rule.

## Phase 4 — Add semantic zoom and navigation

### Story 4.1 — Define semantic zoom tiers

Add named zoom tiers that control information density.

**Acceptance criteria**

- Overview emphasizes PCs, organizations, collapsed summaries, and high-level counts.
- Mid-detail shows organizations, selected/connected NPCs, and aggregated edges.
- Detail shows permitted NPCs, badges, and stacked-edge detail.
- The active tier is predictable and indicated in the UI.
- Selected entities remain discoverable.
- Zoom rules are centralized and tested.

### Story 4.2 — Add graph navigation and focus controls

Provide fit-to-view, reset zoom, focus selected entity, and neighborhood focus controls.

**Acceptance criteria**

- Visible graph content can be fit to the viewport.
- Users can focus an entity neighborhood without changing base filters.
- Focus state has a clear exit path.
- Controls do not require pointer-only interaction.
- Resetting never leaves an invisible selected entity.

### Story 4.3 — Improve visual hierarchy and accessibility

Standardize icons, shapes, selection, tooltips, legend behavior, and text alternatives.

**Acceptance criteria**

- Entity types differ by shape or icon as well as color.
- Relationship category and attitude are not color-only.
- Hover information has keyboard/focus equivalents.
- Legend behavior is linked to filters or explicitly explanatory.
- A text summary exists for selected entity and visible graph state.

## Phase 5 — Deliver optional secondary visualizations

### Story 5.1 — Add relationship matrix view

Create a matrix view from the shared filtered and aggregated data.

**Acceptance criteria**

- Rows and columns use the current filtered visible entities.
- Cells represent aggregate relationship sets.
- Membership appears in row/column context rather than as social cells.
- Cell selection exposes underlying relationships and navigates to either entity.
- Ordering supports entity type and organization grouping.
- Large datasets use a bounded or virtualized rendering strategy.

### Story 5.2 — Add organization-centric hierarchy view

Create a hierarchy with organizations as roots and member PCs/NPCs as children.

**Acceptance criteria**

- Organizations show member count and collapse/expand behavior.
- Multi-organization members appear under each organization but have a canonical selection.
- Unaffiliated entities appear in an unassigned section.
- Inferred membership is visibly identified.
- Selection synchronizes with graph, matrix, and detail.
- Relationship summaries can be opened without adding edge clutter.

### Story 5.3 — Unify view switching and selection

Provide Graph, Matrix, Organization Hierarchy, and Analytics as synchronized views.

**Acceptance criteria**

- Filters apply consistently across views.
- Selection and collapse state synchronize where applicable.
- View switching does not refetch data or lose edits.
- Analytics clearly distinguishes campaign-wide and filtered results.

## Phase 6 — Data lifecycle, performance, and quality

### Story 6.1 — Separate loading from visualization derivation

Consolidate campaign relationship data at a client boundary and eliminate redundant page-local transformations.

**Acceptance criteria**

- Visualization selectors receive one normalized campaign dataset.
- Refresh behavior avoids unnecessary duplicate concurrent requests.
- Entity deletion reconciles affected visualization state.
- Missing endpoints are surfaced as recoverable data issues.

### Story 6.2 — Stabilize graph performance

Memoize selector outputs, preserve layout where practical, debounce high-frequency updates, and bound detail rendering.

**Acceptance criteria**

- Unrelated form edits do not needlessly recreate graph simulation data.
- Unchanged nodes preserve positions through reasonable filter changes.
- Aggregation happens before canvas rendering.
- Semantic zoom limits overview rendering work.
- Performance is assessed with small, medium, and large fixtures.

### Story 6.3 — Persist graph layout positions

Incorporate existing issue #165: persist and restore per-campaign graph node positions.

**Acceptance criteria**

- Dragging a node and reloading restores its approximate position.
- New entities without stored positions use normal placement.
- Position updates save after a short debounce.
- Saved coordinates are scoped by account and campaign.
- The feature works with filtering, clusters, collapse state, and semantic zoom.

### Story 6.4 — Expand automated tests

Test selectors, filters, aggregate edges, badges, collapse state, zoom tiers, matrix, hierarchy, and shared selection.

**Acceptance criteria**

- Pure transformations have focused unit coverage.
- Component tests cover keyboard filtering and synchronized selection.
- Tests cover duplicate IDs across entity types.
- Tests cover explicit versus inferred membership.
- Tests cover multiple relationship types for one entity pair.
- Existing CRUD behavior remains covered.

### Story 6.5 — Document behavior and migration

Document visual semantics, filter behavior, membership precedence, and migration expectations.

**Acceptance criteria**

- Documentation distinguishes membership from social relationships.
- It explains collapse, badges, semantic zoom, and stacked edges.
- Legacy faction behavior and the future migration path are explicit.
- No backend implementation is required.

## Future API recommendations

These recommendations require separate approval and are not part of this front-end refactor.

1. Provide organizations scoped directly to a campaign, including empty organizations.
2. Model membership separately from generic relationships, with entity reference, organization ID, role/title, source, and campaign ID.
3. Rename polymorphic relationship endpoint fields to `sourceEntityId` and `targetEntityId`.
4. Return type metadata including category, display label, and directionality.
5. Offer a campaign-scoped graph projection endpoint for large datasets.
6. Provide a controlled migration from legacy NPC faction strings to explicit memberships.

## Target component structure

```text
relationship-visualization/
  model/       normalized types, entity keys, relationship registry
  selectors/   memberships, filters, aggregation, zoom, view datasets
  state/       visualization state hook/provider
  graph/       graph shell, node, edge, cluster, and controls
  filters/     filter panel and active-filter summary
  matrix/      relationship matrix
  hierarchy/   organization hierarchy
  shared/      legend, selection summaries, and empty states
```

CRUD forms and API hooks remain separate from visualization rendering. `CampaignPage` should compose data, layout, and modals rather than own visualization rules.

## Existing issue collision assessment

- **#165 — Persist and restore entity graph layout positions:** does not conflict. It is incorporated as Story 6.3 because persistent placement complements clustered, collapsible graph behavior.
- Other currently open issues do not overlap this refactor's visualization scope.

## Implementation order

Complete Phases 1 and 2 before changing rendering. Build the typed graph adapter before clusters, collapsible groups, badges, aggregate edges, and semantic zoom. Add matrix and hierarchy only after shared selectors are stable. Finish with performance, layout persistence, tests, and documentation.
