import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TravelEntry {
  id: string;
  photoUri: string;
  address: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  date: string;
}

interface DiaryContextType {
  entries: TravelEntry[];
  addEntry: (entry: TravelEntry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const STORAGE_KEY = '@travel_diary_entries';

const DiaryContext = createContext<DiaryContextType | undefined>(undefined);

const isValidEntry = (entry: unknown): entry is TravelEntry => {
  if (!entry || typeof entry !== 'object') return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.photoUri === 'string' &&
    typeof e.address === 'string' &&
    typeof e.latitude === 'number' &&
    typeof e.longitude === 'number' &&
    typeof e.timestamp === 'number' &&
    typeof e.date === 'string'
  );
};

export const DiaryProvider = ({ children }: { children: ReactNode }) => {
  const [entries, setEntries] = useState<TravelEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      setIsLoading(true);
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(isValidEntry);
          setEntries(valid);
        }
      }
    } catch (e) {
      setError('Failed to load entries. Please restart the app.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const persistEntries = async (updated: TravelEntry[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      setError('Failed to save entry. Please try again.');
      throw new Error('Storage write failed');
    }
  };

  const addEntry = async (entry: TravelEntry) => {
    if (!isValidEntry(entry)) {
      setError('Invalid entry data. Please try again.');
      return;
    }
    const updated = [entry, ...entries];
    await persistEntries(updated);
    setEntries(updated);
  };

  const removeEntry = async (id: string) => {
    if (!id || typeof id !== 'string') {
      setError('Invalid entry ID.');
      return;
    }
    const updated = entries.filter((e) => e.id !== id);
    await persistEntries(updated);
    setEntries(updated);
  };

  const clearError = () => setError(null);

  return (
    <DiaryContext.Provider
      value={{ entries, addEntry, removeEntry, isLoading, error, clearError }}
    >
      {children}
    </DiaryContext.Provider>
  );
};

export const useDiary = (): DiaryContextType => {
  const ctx = useContext(DiaryContext);
  if (!ctx) throw new Error('useDiary must be used within DiaryProvider');
  return ctx;
};