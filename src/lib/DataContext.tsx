import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Job, Quote } from "./types";
import { getJobs, getQuotes, saveQuotes, addQuoteCost as storageSaveCost, deleteQuoteCost as storageDeleteCost } from "./storage";

interface DataContextType {
  jobs: Job[];
  quotes: Quote[];
  refreshAll: () => void;
  refreshQuotes: () => void;
  refreshJobs: () => void;
  addCost: (quoteId: string, cost: Parameters<typeof storageSaveCost>[1]) => ReturnType<typeof storageSaveCost>;
  removeCost: (quoteId: string, costId: string) => void;
  /** Tracks the last update timestamp so consumers can react */
  lastUpdate: number;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>(() => getJobs());
  const [quotes, setQuotes] = useState<Quote[]>(() => getQuotes());
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const bump = () => setLastUpdate(Date.now());

  const refreshJobs = useCallback(() => { setJobs(getJobs()); bump(); }, []);
  const refreshQuotes = useCallback(() => { setQuotes(getQuotes()); bump(); }, []);
  const refreshAll = useCallback(() => { refreshJobs(); refreshQuotes(); }, [refreshJobs, refreshQuotes]);

  const addCost = useCallback((quoteId: string, cost: Parameters<typeof storageSaveCost>[1]) => {
    const result = storageSaveCost(quoteId, cost);
    refreshQuotes();
    return result;
  }, [refreshQuotes]);

  const removeCost = useCallback((quoteId: string, costId: string) => {
    storageDeleteCost(quoteId, costId);
    refreshQuotes();
  }, [refreshQuotes]);

  return (
    <DataContext.Provider value={{ jobs, quotes, refreshAll, refreshQuotes, refreshJobs, addCost, removeCost, lastUpdate }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
