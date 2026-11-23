import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SavedItem } from '../types';
import { dedupeSavedInsights, safeWriteLocalStorage } from '../utils/dataOptimizer';

const STORAGE_KEY = 'axumite_saved_insights';

export interface SavedInsightsActionsType {
  saveInsight: (itemData: Omit<SavedItem, 'id' | 'createdAt'>) => void;
  deleteInsight: (id: string) => void;
  refreshSavedItems: () => void;
}

export interface SavedInsightsStateType {
  savedItems: SavedItem[];
  savedCount: number;
}

const SavedInsightsStateContext = createContext<SavedInsightsStateType | undefined>(undefined);
const SavedInsightsActionsContext = createContext<SavedInsightsActionsType | undefined>(undefined);

function readStoredInsights(): SavedItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? dedupeSavedInsights(parsed) : [];
  } catch {
    return [];
  }
}

export const SavedInsightsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedItems, setSavedItems] = useState<SavedItem[]>(readStoredInsights);

  useEffect(() => {
    safeWriteLocalStorage(STORAGE_KEY, savedItems);
  }, [savedItems]);

  const saveInsight = useCallback((itemData: Omit<SavedItem, 'id' | 'createdAt'>) => {
    const newItem: SavedItem = {
      ...itemData,
      id: Date.now().toString(),
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setSavedItems((prev) => dedupeSavedInsights([newItem, ...prev]));
  }, []);

  const deleteInsight = useCallback((id: string) => {
    setSavedItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const refreshSavedItems = useCallback(() => {
    setSavedItems(readStoredInsights());
  }, []);

  const actionsValue = useMemo<SavedInsightsActionsType>(
    () => ({ saveInsight, deleteInsight, refreshSavedItems }),
    [saveInsight, deleteInsight, refreshSavedItems]
  );

  const stateValue = useMemo<SavedInsightsStateType>(
    () => ({ savedItems, savedCount: savedItems.length }),
    [savedItems]
  );

  return (
    <SavedInsightsActionsContext.Provider value={actionsValue}>
      <SavedInsightsStateContext.Provider value={stateValue}>
        {children}
      </SavedInsightsStateContext.Provider>
    </SavedInsightsActionsContext.Provider>
  );
};

export const useSavedInsights = (): SavedInsightsStateType & SavedInsightsActionsType => {
  const state = useContext(SavedInsightsStateContext);
  const actions = useContext(SavedInsightsActionsContext);
  if (!state || !actions) {
    throw new Error('useSavedInsights must be used within a SavedInsightsProvider');
  }
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
};

export const useSavedInsightsActions = (): SavedInsightsActionsType => {
  const actions = useContext(SavedInsightsActionsContext);
  if (!actions) {
    throw new Error('useSavedInsightsActions must be used within a SavedInsightsProvider');
  }
  return actions;
};

export const useSavedInsightsCount = (): number => {
  const state = useContext(SavedInsightsStateContext);
  if (!state) {
    throw new Error('useSavedInsightsCount must be used within a SavedInsightsProvider');
  }
  return state.savedCount;
};
