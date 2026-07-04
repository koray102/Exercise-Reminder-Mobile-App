import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode, useCallback } from 'react';
import { getAllCategories } from '../repositories/CategoryRepository';
import { getExercisesByCategory } from '../repositories/ExerciseRepository';
import { getStreaks } from '../repositories/StreakRepository';
import { getSettings } from '../repositories/SettingsRepository';
import { Category, Exercise, Streaks, Settings } from '../types';

// ===== State Type =====
interface AppState {
  categories: Category[];
  exercisesByCategory: Record<string, Exercise[]>;
  streaks: Streaks | null;
  settings: Settings | null;
  isLoading: boolean;
}

// ===== Actions =====
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_EXERCISES'; payload: { categoryId: string; exercises: Exercise[] } }
  | { type: 'SET_STREAKS'; payload: Streaks }
  | { type: 'SET_SETTINGS'; payload: Settings }
  | { type: 'SET_ALL_EXERCISES'; payload: Record<string, Exercise[]> };

// ===== Reducer =====
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'SET_EXERCISES':
      return {
        ...state,
        exercisesByCategory: {
          ...state.exercisesByCategory,
          [action.payload.categoryId]: action.payload.exercises,
        },
      };
    case 'SET_ALL_EXERCISES':
      return { ...state, exercisesByCategory: action.payload };
    case 'SET_STREAKS':
      return { ...state, streaks: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    default:
      return state;
  }
}

// ===== Context =====
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  refreshData: () => Promise<void>;
  refreshStreaks: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

// ===== Provider =====
const initialState: AppState = {
  categories: [],
  exercisesByCategory: {},
  streaks: null,
  settings: null,
  isLoading: true,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const isRefreshing = useRef(false);

  const refreshData = useCallback(async () => {
    if (isRefreshing.current) {
      console.log('[AppContext] refreshData skipped — already in progress');
      return;
    }
    isRefreshing.current = true;

    try {
      console.log('[AppContext] refreshData START');
      dispatch({ type: 'SET_LOADING', payload: true });

      const categories = await getAllCategories();
      const streaks = await getStreaks();
      const settings = await getSettings();

      dispatch({ type: 'SET_CATEGORIES', payload: categories });
      dispatch({ type: 'SET_STREAKS', payload: streaks });
      dispatch({ type: 'SET_SETTINGS', payload: settings });

      const exercisesMap: Record<string, Exercise[]> = {};
      for (const cat of categories) {
        exercisesMap[cat.id] = await getExercisesByCategory(cat.id);
      }
      dispatch({ type: 'SET_ALL_EXERCISES', payload: exercisesMap });

      console.log('[AppContext] refreshData DONE');
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('[AppContext] Failed to refresh data:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    } finally {
      isRefreshing.current = false;
    }
  }, []); // dispatch is stable

  const refreshStreaks = useCallback(async () => {
    try {
      const streaks = await getStreaks();
      dispatch({ type: 'SET_STREAKS', payload: streaks });
    } catch (error) {
      console.error('Failed to refresh streaks:', error);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <AppContext.Provider value={{ state, dispatch, refreshData, refreshStreaks }}>
      {children}
    </AppContext.Provider>
  );
}

// ===== Hook =====
export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
