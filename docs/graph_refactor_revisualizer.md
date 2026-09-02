# Relationship Graph Refactor: Plan of Action

This document tracks the phased, dependency-ordered plan for refactoring the relationship
graph visualization. The implementation scope is strictly React + TypeScript, keeping API
calls backward-compatible and leaving backend changes as future recommendations.

## Status

- ✅ **Phase 1 — Establish a Reliable Relationship Visualization Domain: COMPLETE**
- ⬜ Phase 2 — Decompose Page State and Introduce Graph Controls
- ⬜ Phase 3 — Rebuild the Graph Renderer Around Visual Hierarchy
- ⬜ Phase 4 — Add Semantic Zoom and Graph Interaction Refinement
- ⬜ Phase 5 — Deliver Optional Secondary Visualizations
- ⬜ Phase 6 — Data Lifecycle, Performance, and Quality Hardening

**Next starting story: Story 2.1 — Extract Visualization State Hook and Provider**

## Execution Sequence

```
Phase 1: Visualization Domain (Types -> Metadata -> Selectors -> Precedence)  [DONE]
   │
   ▼
Phase 2: State & Controls (Visualization State Hook -> Filter Panel -> Empty/Loading States)
   │
   ▼
Phase 3: Graph Renderer & Visual Hierarchy (Graph Shell Adapter -> Cluster Containers ->
         Collapsible Orgs -> Node Badges -> Stacked Edges)
   │
   ▼
Phase 4: Interaction & Navigation (Semantic Zoom -> Navigation & Focus Controls ->
         Accessibility & Non-Canvas Fallbacks)
   │
   ▼
Phase 5: Secondary Visualizations (Matrix View -> Hierarchy View -> Unified View Switching)
   │
   ▼
Phase 6: Hardening, Performance & Docs (Data Loading Consolidation -> Performance
         Optimization -> Test Coverage -> Documentation)
```

---

## Phase 1 — Establish a Reliable Relationship Visualization Domain ✅ COMPLETE

### Story 1.1 — Define Canonical Visualization Types ✅

- **Summary:** Introduce a typed domain model for visualization entities, endpoint
  references, memberships, nodes, aggregate edges, filter criteria, zoom tiers, and view
  modes.
- **Rationale:** Replaces ambiguous polymorphic fields (`npcId1`/`npcId2`) and prevents
  each visual component from independently guessing entity types and relationship
  meanings.
- **Dependencies:** None (baseline story).
- **Implementation:** `HaywireGM.React/src/types/visualization.ts`
- **Acceptance Criteria:**
  - Entity identity is represented as a typed pair (`{ entityType, id }`) or a canonical
    key (`entityType:id`) across all visualization code.
  - Relationship endpoints use neutral terms (`source`, `target`) rather than
    NPC-specific property names.
  - Organization membership is modeled as a distinct record type separate from standard
    social relationships.
  - Aggregated edges preserve all underlying relationship IDs, type categories,
    descriptions, and attitude values.
  - Transformations from existing API DTOs remain strictly backward-compatible at the
    boundary.

### Story 1.2 — Centralize Relationship Metadata Registry ✅

- **Summary:** Establish a single client-side metadata registry for relationship labels,
  visual encodings, category classifications, and fallback rules.
- **Rationale:** Color and category mappings were previously fragmented and duplicated
  across `EntityGraph`, `CampaignPage`, `RelationshipManager`, `EntityDetailPanel`, and
  analytics.
- **Dependencies:** Story 1.1
- **Implementation:** `HaywireGM.React/src/domain/relationshipMetadata.ts`
- **Acceptance Criteria:**
  - Graph, detail panels, legends, filter controls, matrix, and hierarchy views consume
    the same metadata source of truth.
  - Membership has dedicated classification, badges, and visual treatment distinct from
    social relationships.
  - Unrecognized or legacy relationship types display safely using a neutral fallback
    configuration.
  - All private, conflicting relationship color dictionaries across visualization
    components are eliminated.

### Story 1.3 — Create Campaign Visualization Selector Layer ✅

- **Summary:** Build pure selectors to normalize entities, resolve memberships, filter
  relationships, aggregate parallel edges, and produce view-ready datasets.
- **Rationale:** Decouples complex business and visual transformation logic from React
  component render lifecycles and `CampaignPage`.
- **Dependencies:** Story 1.1, Story 1.2
- **Implementation:** `HaywireGM.React/src/domain/visualizationSelectors.ts`
- **Acceptance Criteria:**
  - All transformation selectors are pure functions with independent unit test coverage.
  - `CampaignPage` no longer creates synthetic graph nodes or edges inline.
  - Standard social relationship edge lists exclude membership edges by default.
  - Membership badges are derived without creating redundant graph network edges.
  - Dangling or missing relationship endpoints are handled gracefully without breaking
    rendering.

### Story 1.4 — Define Membership Precedence and Migration Rules ✅

- **Summary:** Implement precedence rules resolving explicit organization relationships
  versus legacy NPC text factions.
- **Rationale:** Cluster containers and group collapse require a single canonical
  membership truth per entity.
- **Dependencies:** Story 1.1, Story 1.3
- **Implementation:** `HaywireGM.React/src/domain/membershipPrecedence.ts`
- **Acceptance Criteria:**
  - Explicit membership relationships take precedence over matching legacy faction text.
  - Legacy faction-only memberships are clearly flagged as inferred/read-only in the UI.
  - Entities belonging to an organization through both sources are not duplicated.
  - Inferred memberships cannot be edited or deleted through explicit relationship CRUD
    actions.
  - Precedence behavior is documented for future backend data migration.

---

## Phase 2 — Decompose Page State and Introduce Graph Controls

### Story 2.1 — Extract Visualization State Hook and Provider

- **Summary:** Move selection, active filters, collapsed organization tracking, active
  view, and zoom tier state from `CampaignPage` into a dedicated visualization state
  store.
- **Rationale:** Separates durable campaign data operations from transient visual
  exploration preferences.
- **Dependencies:** Story 1.3
- **Acceptance Criteria:**
  - `CampaignPage` acts purely as a layout and composition shell.
  - Filter, selection, organization collapse, and view mode transitions use typed
    actions.
  - Resetting or clearing filters restores the default visual state without affecting
    campaign entities.
  - Selected entity remains valid across filter adjustments, zoom shifts, and collapse
    toggles.
  - State can be persisted per campaign in browser storage without saving ephemeral
    simulation coordinates.

### Story 2.2 — Build Accessible Relationship Filter Panel

- **Summary:** Replace the basic entity-type toggle buttons with a comprehensive,
  keyboard-accessible filter panel.
- **Rationale:** Users need to isolate relationship subsets by category, perspective, and
  source type as campaign density grows.
- **Dependencies:** Story 1.2, Story 2.1
- **Acceptance Criteria:**
  - Supports filtering by entity type (NPC, PC, Organization).
  - Supports filtering by specific relationship types and categories.
  - Provides perspective filters: All, PC-centric, NPC-centric, and Organization-centric.
  - Includes options to toggle inferred memberships and isolated (unconnected) entities.
  - Displays active filter count, a single-click "Clear All" action, and empty-filter
    helper text.
  - All filter inputs are fully keyboard operable with accessible ARIA labels.

### Story 2.3 — Define Shared View-Level Empty and Loading States

- **Summary:** Create standardized loading, empty, filtered-empty, and error recovery
  states shared across Graph, Matrix, and Hierarchy views.
- **Rationale:** Current graph displays a generic "no relationships" message even when
  campaign entities exist and should be browsable.
- **Dependencies:** Story 2.1, Story 2.2
- **Acceptance Criteria:**
  - Campaigns with entities but zero social relationships still display entities and
    membership clusters.
  - Filtered-empty states explain which filter criteria caused zero results and offer a
    one-click reset.
  - API errors retain cached or partially loaded entity context rather than blanking the
    canvas.
  - Each view provides explicit retry and reset recovery actions.

---

## Phase 3 — Rebuild the Graph Renderer Around Visual Hierarchy

### Story 3.1 — Refactor Graph Shell with Typed Graph Adapter

- **Summary:** Refactor `EntityGraph` into a modular graph shell receiving a prepared
  view model and delegating canvas rendering to dedicated node, edge, cluster, and
  interaction modules.
- **Rationale:** Eliminates `any` types and monolithic canvas callbacks, making visual
  components independently testable.
- **Dependencies:** Story 1.1, Story 1.3, Story 2.1
- **Acceptance Criteria:**
  - Internal graph structures contain zero `any` types.
  - Node drawing, edge drawing, tooltips, and canvas interactions reside in isolated,
    testable modules.
  - Graph shell renders valid visualizations even when entities or edges are omitted by
    active filters.
  - Node selection, hover callbacks, and existing click actions remain fully functional.

### Story 3.2 — Add Organization Cluster Containers

- **Summary:** Render visual container boundaries around expanded organizations and
  their member NPCs.
- **Rationale:** Establishes visual organization hierarchy before users inspect
  individual pairwise relationships.
- **Dependencies:** Story 1.4, Story 3.1
- **Acceptance Criteria:**
  - Expanded organizations render a distinct, subtle boundary enclosing member NPCs.
  - Cluster headers display organization name and visible member count.
  - Members belonging to multiple organizations are rendered without duplicating node
    instances; badges reflect all memberships.
  - Cluster boundaries dynamically recalculate during filtering, zooming, and
    collapsing.
  - Non-member PCs and NPCs remain outside container boundaries.
  - Cluster containers do not block node selection or obscure text labels.

### Story 3.3 — Add Collapsible Organization Controls

- **Summary:** Enable organization nodes to collapse and expand their member nodes
  directly in the graph.
- **Rationale:** Minimizes canvas clutter while retaining high-level organizational
  structure.
- **Dependencies:** Story 3.1, Story 3.2
- **Acceptance Criteria:**
  - Expanded organizations display the cluster container and individual member nodes.
  - Collapsed organizations display a single organization node showing total and visible
    member tallies.
  - Collapsing hides internal member nodes without altering underlying campaign data or
    unrelated entities.
  - Cross-organization relationships from collapsed members are summarized into
    high-level connections with tooltips.
  - Expanding an organization restores filtered member visibility and selection state.
  - Collapse states are tracked per organization and persist across view switches.

### Story 3.4 — Render Membership as Node Badges

- **Summary:** Remove organization membership from standard graph force edges and render
  memberships as compact badges on entity nodes.
- **Rationale:** Membership represents containment and affiliation rather than a
  peer-to-peer social link.
- **Dependencies:** Story 1.2, Story 1.3, Story 3.1
- **Acceptance Criteria:**
  - Entity-to-organization memberships do not generate standard force-directed graph
    edges.
  - Node badges display organization affiliation with an indicator for multi-organization
    members.
  - Hovering or focusing a badge reveals all memberships and whether each is explicit or
    inferred.
  - Affiliation remains visible in detail panels, matrix, and hierarchy views.
  - Organization filtering includes member entities even when visual membership edges
    are suppressed.

### Story 3.5 — Aggregate Parallel Relationships into Stacked Edges

- **Summary:** Combine multiple non-membership relationships between two entities into a
  single visual edge displaying segmented relationship indicators.
- **Rationale:** Parallel overlapping edges obscure complex multi-faceted relationships
  between characters.
- **Dependencies:** Story 1.1, Story 1.2, Story 3.1
- **Acceptance Criteria:**
  - Exactly one graph edge is rendered per entity pair and directionality rule.
  - Stacked edges visually indicate multiple relationship types without relying solely on
    color.
  - Hovering or focusing the edge reveals all underlying relationships, descriptions,
    and attitudes.
  - Entity detail panel allows editing or deleting individual underlying relationships.
  - Filtering by a relationship type includes the aggregate edge if any underlying
    relationship matches.
  - Edge attitude styling applies a documented aggregation rule rather than picking
    arbitrarily.

---

## Phase 4 — Add Semantic Zoom and Graph Interaction Refinement

### Story 4.1 — Define Semantic Zoom Tiers

- **Summary:** Introduce named semantic zoom tiers (Overview, Mid-Detail, Detail) that
  adapt visual density based on zoom level.
- **Rationale:** Large campaigns require high-level summaries at low zoom before
  inspecting dense pairwise connections.
- **Dependencies:** Story 2.1, Story 3.1, Story 3.5
- **Acceptance Criteria:**
  - Overview tier prioritizes PCs, organizations, collapsed group tallies, and major
    connections.
  - Mid-Detail tier displays organizations, connected NPCs, and aggregated edges.
  - Detail tier displays all permitted NPCs, membership badges, and granular
    stacked-edge details.
  - Active zoom tier updates predictably and communicates current scale to the user.
  - Selected entities remain discoverable regardless of the current zoom tier visibility
    rules.
  - Zoom thresholds and visibility rules are governed by centralized, unit-tested
    selectors.

### Story 4.2 — Add Graph Navigation and Focus Controls

- **Summary:** Provide controls for fit-to-view, zoom reset, selected entity centering,
  and 1-hop neighborhood isolation.
- **Rationale:** Facilitates rapid navigation and visual recovery in dense
  force-directed graphs.
- **Dependencies:** Story 2.1, Story 3.1
- **Acceptance Criteria:**
  - "Fit to View" recalculates canvas boundaries to frame all visible nodes.
  - "Focus Selected" centers the viewport on the active entity.
  - Neighborhood focus isolates the selected entity and its direct connections without
    altering global filters.
  - Neighborhood focus provides a prominent, one-click exit action.
  - Controls are keyboard accessible and do not produce phantom selection states.

### Story 4.3 — Improve Graph Information Hierarchy and Accessibility

- **Summary:** Enhance node shape encodings, focus indicators, interactive legends,
  tooltips, and text-based summaries.
- **Rationale:** Color-only differentiation and canvas-only interaction create
  accessibility and discoverability barriers.
- **Dependencies:** Story 1.2, Story 3.1, Story 4.2
- **Acceptance Criteria:**
  - Entity types are distinguishable by distinct shapes and iconography in addition to
    color.
  - Relationship categories and attitudes do not rely on color alone (e.g., using icons
    and line patterns).
  - Keyboard navigation allows traversing nodes, clusters, and aggregate edges with
    equivalent detail popovers.
  - Legend items support interactive filtering or link directly to filter panel
    controls.
  - An accessible text-based summary is available describing selected entities and
    current graph metrics.

---

## Phase 5 — Deliver Optional Secondary Visualizations

### Story 5.1 — Add Relationship Matrix View

- **Summary:** Implement a grid-based relationship matrix tab consuming the shared
  visualization selector pipeline.
- **Rationale:** Enables structured pairwise inspection and relationship density
  comparison across large character rosters.
- **Dependencies:** Story 1.3, Story 2.1, Story 3.5
- **Acceptance Criteria:**
  - Rows and columns reflect the current filtered set of visible entities.
  - Matrix cells display aggregated relationship summaries between character pairs.
  - Membership is indicated in row/column headers rather than confused with social
    cells.
  - Selecting a cell exposes underlying relationships and allows navigation to either
    entity.
  - Supports row/column grouping by entity type and organization.
  - Large datasets utilize virtualization or bounded rendering for smooth performance.

### Story 5.2 — Add Organization-Centric Hierarchy View

- **Summary:** Implement a tree-based hierarchy view with organizations as root nodes
  and affiliated characters as children.
- **Rationale:** Provides an immediate, unambiguous answer to organizational structure
  without force simulation drift.
- **Dependencies:** Story 1.3, Story 1.4, Story 2.1
- **Acceptance Criteria:**
  - Organizations display member counts with expandable/collapsible tree nodes.
  - Characters belonging to multiple organizations appear under each respective
    organization while preserving a single selection identity.
  - Unaffiliated PCs and NPCs appear under an explicit "Unassigned" section.
  - Legacy inferred memberships are visually differentiated from explicit memberships.
  - Selecting an item synchronizes active entity selection across Graph, Matrix, and
    Detail panels.

### Story 5.3 — Unify View Switching and Shared Selection

- **Summary:** Replace top-level view tabs with unified switching across Graph, Matrix,
  Hierarchy, and Analytics tabs using shared visualization state.
- **Rationale:** Secondary visualizations should be synchronized perspectives of the
  same campaign model.
- **Dependencies:** Story 2.1, Story 5.1, Story 5.2
- **Acceptance Criteria:**
  - Filter selections apply identically across Graph, Matrix, Hierarchy, and Analytics.
  - Entity selection and organization collapse states stay synchronized across views.
  - Switching tabs preserves in-memory state and unsaved relationship modal drafts
    without reloading.
  - Analytics view explicitly communicates whether metrics reflect the whole campaign or
    active filters.

---

## Phase 6 — Data Lifecycle, Performance, and Quality Hardening

### Story 6.1 — Consolidate Campaign Data Loading Boundary

- **Summary:** Unify entity and relationship loading into a centralized campaign
  relationship data hook, removing ad-hoc page transformations.
- **Rationale:** Eliminates redundant network requests and ensures complete organization
  context.
- **Dependencies:** Story 1.3, Story 2.1
- **Acceptance Criteria:**
  - Visualization selectors receive a single, normalized campaign dataset.
  - Data refresh and mutation reconciliation avoid duplicate concurrent network calls.
  - Entity deletion cleanly updates all dependent visual and selection state.
  - Incomplete or dangling relationship references are surfaced as recoverable warnings
    rather than crashing views.

### Story 6.2 — Stabilize Force-Graph Performance

- **Summary:** Apply memoization, layout stabilization, debounced filter evaluation, and
  bounded canvas rendering.
- **Rationale:** Force simulations degrade rapidly as node and edge counts increase.
- **Dependencies:** Story 3.1, Story 4.1
- **Acceptance Criteria:**
  - Form edits and unrelated UI renders do not restart the force simulation.
  - Filter updates preserve existing node positions for unchanged visible entities where
    feasible.
  - Edge aggregation occurs prior to render passes, minimizing draw calls.
  - Detail rendering is bounded at Overview zoom tiers.
  - Verified performance stability across small, medium, and large campaign fixtures.

### Story 6.3 — Expand Automated Unit and Integration Tests

- **Summary:** Add comprehensive automated tests covering selectors, filtering, edge
  aggregation, membership precedence, badges, zoom tiers, and view synchronization.
- **Rationale:** Protects core relationship semantics and prevents regressions across
  visual representations.
- **Dependencies:** Stories 1.1 through 6.2
- **Acceptance Criteria:**
  - Unit tests cover all selector transformation, aggregation, and precedence rules.
  - Integration tests verify filter application, view switching, and selection
    synchronization.
  - Test suites validate collision handling for matching IDs across different entity
    types.
  - Tests verify explicit vs. inferred membership precedence and multi-relationship
    stacked edges.
  - All existing CRUD flows, form validations, and campaign page tests remain passing.

### Story 6.4 — Document Visualization Architecture and Migration Path

- **Summary:** Document the client-side relationship model, filter semantics, visual
  encodings, precedence rules, and future API migration recommendations.
- **Rationale:** Ensures maintainability for future contributors and establishes a clear
  roadmap for eventual backend cleanup.
- **Dependencies:** Stories 1.1 through 6.3
- **Acceptance Criteria:**
  - Clear architectural overview distinguishing social relationships from organization
    containment.
  - Documentation covers organization clustering, collapse states, stacked edges, and
    semantic zoom rules.
  - Migration notes document legacy faction text fallback and recommended future API
    enhancements.
  - Implementation remains strictly client-side React + TypeScript.

---

## Recommended Future Backend API Improvements (Non-Blocking Reference)

These backend items are recommended future improvements for the API contract and are not
part of the client implementation scope:

- **Campaign-Scoped Organizations:** Return organizations filtered by campaign directly,
  including empty organizations.
- **First-Class Membership Entities:** Dedicated membership schema (`entityType`,
  `entityId`, `organizationId`, `role`, `source`).
- **Neutral Endpoint Fields:** Standardize endpoint keys to `sourceEntityId` and
  `targetEntityId` instead of `npcId1`/`npcId2`.
- **Relationship Directionality Metadata:** Expose type characteristics (directional,
  reciprocal, symmetric) from the server.
- **Campaign Graph Projection Endpoint:** Single aggregated payload returning normalized
  entities and relationships for large campaigns.
