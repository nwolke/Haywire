import type { EntityType } from '@/types/entity';
import type { RelationshipFilterCriteria, ViewMode, ZoomTier } from '@/types/visualization';

/**
 * Transient visual exploration state for a campaign visualization.
 * This state is distinct from durable campaign entity data and represents
 * user preferences for filtering, selection, zooming, and view mode.
 *
 * Story 2.1: Extract Visualization State Hook and Provider
 */
export interface VisualizationState {
  // Selected entity for detail panel inspection
  selectedEntity: { id: number; entityType: EntityType } | null;

  // Active filter criteria applied to the visualization
  filters: RelationshipFilterCriteria;

  // Set of organization IDs that are currently collapsed
  collapsedOrganizations: Set<number>;

  // Active visualization view mode (graph, matrix, hierarchy, analytics)
  activeView: ViewMode;

  // Semantic zoom tier for the current view
  zoomTier: ZoomTier;

  // Free-text search filter (for entity name/description search)
  search: string;
}

/**
 * Typed action union for visualization state updates.
 * Each action is a discriminated union that ensures type-safe state transitions.
 */
export type VisualizationAction =
  | { type: 'SET_SELECTED_ENTITY'; payload: { id: number; entityType: EntityType } | null }
  | { type: 'SET_FILTERS'; payload: RelationshipFilterCriteria }
  | { type: 'UPDATE_FILTER'; payload: Partial<RelationshipFilterCriteria> }
  | { type: 'TOGGLE_ORGANIZATION_COLLAPSED'; payload: number }
  | { type: 'SET_COLLAPSED_ORGANIZATIONS'; payload: Set<number> }
  | { type: 'SET_ACTIVE_VIEW'; payload: ViewMode }
  | { type: 'SET_ZOOM_TIER'; payload: ZoomTier }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'RESET_TO_DEFAULT' }
  | { type: 'LOAD_STATE'; payload: VisualizationState };

/**
 * Create the default visualization state for a campaign.
 * Used both as the initial state and for resetting filters.
 */
export function createDefaultVisualizationState(): VisualizationState {
  return {
    selectedEntity: null,
    filters: {
      entityTypes: ['npc', 'pc', 'organization'],
      relationshipTypes: [],
      categories: [],
      perspective: 'all',
      includeInferredMemberships: true,
      includeIsolatedEntities: true,
    },
    collapsedOrganizations: new Set(),
    activeView: 'graph',
    zoomTier: 'mid-detail',
    search: '',
  };
}

/**
 * Reducer function for visualization state updates.
 * Ensures type-safe, predictable state transitions.
 */
export function visualizationStateReducer(
  state: VisualizationState,
  action: VisualizationAction
): VisualizationState {
  switch (action.type) {
    case 'SET_SELECTED_ENTITY':
      return { ...state, selectedEntity: action.payload };

    case 'SET_FILTERS':
      return { ...state, filters: action.payload };

    case 'UPDATE_FILTER':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };

    case 'TOGGLE_ORGANIZATION_COLLAPSED': {
      const updated = new Set(state.collapsedOrganizations);
      if (updated.has(action.payload)) {
        updated.delete(action.payload);
      } else {
        updated.add(action.payload);
      }
      return { ...state, collapsedOrganizations: updated };
    }

    case 'SET_COLLAPSED_ORGANIZATIONS':
      return { ...state, collapsedOrganizations: action.payload };

    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: action.payload };

    case 'SET_ZOOM_TIER':
      return { ...state, zoomTier: action.payload };

    case 'SET_SEARCH':
      return { ...state, search: action.payload };

    case 'RESET_TO_DEFAULT':
      return createDefaultVisualizationState();

    case 'LOAD_STATE':
      return action.payload;

    default:
      return state;
  }
}

/**
 * Serializable representation of VisualizationState for localStorage.
 * Set<number> must be converted to number[] for JSON serialization.
 */
export interface SerializedVisualizationState {
  selectedEntity: { id: number; entityType: EntityType } | null;
  filters: RelationshipFilterCriteria;
  collapsedOrganizations: number[];
  activeView: ViewMode;
  zoomTier: ZoomTier;
  search: string;
}

/**
 * Convert VisualizationState to a serializable form for localStorage.
 */
export function serializeVisualizationState(state: VisualizationState): SerializedVisualizationState {
  return {
    selectedEntity: state.selectedEntity,
    filters: state.filters,
    collapsedOrganizations: Array.from(state.collapsedOrganizations),
    activeView: state.activeView,
    zoomTier: state.zoomTier,
    search: state.search,
  };
}

/**
 * Convert a serialized state from localStorage back to VisualizationState.
 * Gracefully handles missing or malformed data by falling back to defaults.
 */
export function deserializeVisualizationState(data: unknown): VisualizationState {
  if (!data || typeof data !== 'object') {
    return createDefaultVisualizationState();
  }

  const serialized = data as Record<string, unknown>;
  const defaultState = createDefaultVisualizationState();

  return {
    selectedEntity: serialized.selectedEntity ?? defaultState.selectedEntity,
    filters: serialized.filters ?? defaultState.filters,
    collapsedOrganizations: new Set(
      Array.isArray(serialized.collapsedOrganizations)
        ? serialized.collapsedOrganizations
        : []
    ),
    activeView: (serialized.activeView as ViewMode) ?? defaultState.activeView,
    zoomTier: (serialized.zoomTier as ZoomTier) ?? defaultState.zoomTier,
    search: typeof serialized.search === 'string' ? serialized.search : defaultState.search,
  };
}
