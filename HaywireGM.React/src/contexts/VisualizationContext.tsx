import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { EntityType } from '@/types/entity';
import type { RelationshipFilterCriteria, ViewMode, ZoomTier } from '@/types/visualization';
import {
  VisualizationState,
  VisualizationAction,
  createDefaultVisualizationState,
  visualizationStateReducer,
  serializeVisualizationState,
  deserializeVisualizationState,
} from '@/types/visualizationState';

/**
 * Context type provides both the state and dispatch functions for the visualization layer.
 * Story 2.1: Extract Visualization State Hook and Provider
 */
interface VisualizationContextType {
  state: VisualizationState;
  dispatch: (action: VisualizationAction) => void;

  // Convenience action creators (reduce boilerplate in consuming components)
  setSelectedEntity: (id: number, entityType: EntityType) => void;
  clearSelectedEntity: () => void;
  setFilters: (filters: RelationshipFilterCriteria) => void;
  updateFilters: (partial: Partial<RelationshipFilterCriteria>) => void;
  toggleOrganizationCollapsed: (organizationId: number) => void;
  setActiveView: (view: ViewMode) => void;
  setZoomTier: (tier: ZoomTier) => void;
  setSearch: (query: string) => void;
  resetVisualization: () => void;
}

const VisualizationContext = createContext<VisualizationContextType | undefined>(undefined);

interface VisualizationProviderProps {
  children: ReactNode;
  campaignId: number | undefined;
}

/**
 * Provides visualization state management for a campaign.
 *
 * The provider:
 * - Initializes state from localStorage (per campaign)
 * - Persists state changes back to localStorage
 * - Provides typed action creators for convenience
 * - Ensures state is reset/restored when campaign changes
 */
export function VisualizationProvider({ children, campaignId }: VisualizationProviderProps) {
  // Initialize state from localStorage if available, otherwise use default
  const getInitialState = (): VisualizationState => {
    if (!campaignId) {
      return createDefaultVisualizationState();
    }

    const storageKey = `haywiregm_visualization_${campaignId}`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return deserializeVisualizationState(parsed);
      } catch (err) {
        console.warn(`[VisualizationProvider] Failed to deserialize state for campaign ${campaignId}:`, err);
      }
    }

    return createDefaultVisualizationState();
  };

  const [state, dispatch] = useReducer(visualizationStateReducer, undefined, getInitialState);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (!campaignId) return;

    const storageKey = `haywiregm_visualization_${campaignId}`;
    const serialized = serializeVisualizationState(state);

    try {
      localStorage.setItem(storageKey, JSON.stringify(serialized));
    } catch (err) {
      console.warn(`[VisualizationProvider] Failed to persist state for campaign ${campaignId}:`, err);
    }
  }, [state, campaignId]);

  // When campaign changes, reset to initial state (which loads from localStorage for the new campaign)
  useEffect(() => {
    dispatch({ type: 'RESET_TO_DEFAULT' });
  }, [campaignId]);

  // Convenience action creators to reduce boilerplate
  const value: VisualizationContextType = {
    state,
    dispatch,

    setSelectedEntity: (id: number, entityType: EntityType) => {
      dispatch({ type: 'SET_SELECTED_ENTITY', payload: { id, entityType } });
    },

    clearSelectedEntity: () => {
      dispatch({ type: 'SET_SELECTED_ENTITY', payload: null });
    },

    setFilters: (filters: RelationshipFilterCriteria) => {
      dispatch({ type: 'SET_FILTERS', payload: filters });
    },

    updateFilters: (partial: Partial<RelationshipFilterCriteria>) => {
      dispatch({ type: 'UPDATE_FILTER', payload: partial });
    },

    toggleOrganizationCollapsed: (organizationId: number) => {
      dispatch({ type: 'TOGGLE_ORGANIZATION_COLLAPSED', payload: organizationId });
    },

    setActiveView: (view: ViewMode) => {
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
    },

    setZoomTier: (tier: ZoomTier) => {
      dispatch({ type: 'SET_ZOOM_TIER', payload: tier });
    },

    setSearch: (query: string) => {
      dispatch({ type: 'SET_SEARCH', payload: query });
    },

    resetVisualization: () => {
      dispatch({ type: 'RESET_TO_DEFAULT' });
    },
  };

  return (
    <VisualizationContext.Provider value={value}>
      {children}
    </VisualizationContext.Provider>
  );
}

/**
 * Hook to consume the visualization context.
 * Must be called from within a VisualizationProvider subtree.
 */
export function useVisualization() {
  const context = useContext(VisualizationContext);
  if (context === undefined) {
    throw new Error('useVisualization must be used within a VisualizationProvider');
  }
  return context;
}
