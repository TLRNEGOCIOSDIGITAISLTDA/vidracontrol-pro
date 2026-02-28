import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Job, Quote, QuoteStatus, JobItem } from "./types";
import { getJobs, getQuotes, saveQuotes, addJob as storageAddJob, addQuoteCost as storageSaveCost, deleteQuoteCost as storageDeleteCost } from "./storage";

interface DataContextType {
  jobs: Job[];
  quotes: Quote[];
  refreshAll: () => void;
  refreshQuotes: () => void;
  refreshJobs: () => void;
  addCost: (quoteId: string, cost: Parameters<typeof storageSaveCost>[1]) => ReturnType<typeof storageSaveCost>;
  removeCost: (quoteId: string, costId: string) => void;
  changeQuoteStatus: (quoteId: string, newStatus: QuoteStatus) => void;
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

  const changeQuoteStatus = useCallback((quoteId: string, newStatus: QuoteStatus) => {
    const allQuotes = getQuotes();
    const idx = allQuotes.findIndex(q => q.id === quoteId);
    if (idx === -1) return;

    const quote = allQuotes[idx];
    const prevStatus = quote.status || 'orcado';
    allQuotes[idx] = { ...quote, status: newStatus };
    saveQuotes(allQuotes);

    // When moving to "fechado", auto-create a Job from the quote
    if (newStatus === 'fechado' && prevStatus !== 'fechado') {
      const jobItems: JobItem[] = quote.items.map(item => ({
        id: crypto.randomUUID(),
        type: item.type,
        description: item.description,
        width: item.width ? item.width * 1000 : undefined,
        height: item.height ? item.height * 1000 : undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        area: item.width && item.height ? item.width * item.height * item.quantity : undefined,
      }));

      storageAddJob({
        clientName: quote.clientName,
        description: `Orçamento aprovado — ${quote.jobType || 'Vidraçaria'}`,
        saleValue: quote.total,
        status: 'em_andamento',
        items: jobItems,
      });

      refreshJobs();
    }

    refreshQuotes();
  }, [refreshJobs, refreshQuotes]);

  return (
    <DataContext.Provider value={{ jobs, quotes, refreshAll, refreshQuotes, refreshJobs, addCost, removeCost, changeQuoteStatus, lastUpdate }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
