import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Job, Quote, QuoteStatus, JobItem } from "./types";
import {
  getJobs,
  getQuotes,
  addJob as storageAddJob,
  addQuoteCost as storageSaveCost,
  deleteQuoteCost as storageDeleteCost,
  deleteJob as storageDeleteJob,
  deleteQuote as storageDeleteQuote,
  saveQuoteStatus,
} from "./storage";

interface DataContextType {
  jobs: Job[];
  quotes: Quote[];
  loading: boolean;
  refreshAll: () => Promise<void>;
  refreshQuotes: () => Promise<void>;
  refreshJobs: () => Promise<void>;
  addCost: (quoteId: string, cost: Parameters<typeof storageSaveCost>[1]) => Promise<Awaited<ReturnType<typeof storageSaveCost>>>;
  removeCost: (quoteId: string, costId: string) => Promise<void>;
  changeQuoteStatus: (quoteId: string, newStatus: QuoteStatus) => Promise<void>;
  removeJob: (jobId: string) => Promise<void>;
  removeQuote: (quoteId: string) => Promise<void>;
  lastUpdate: number;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const bump = () => setLastUpdate(Date.now());

  const refreshJobs = useCallback(async () => {
    const data = await getJobs();
    setJobs(data);
    bump();
  }, []);

  const refreshQuotes = useCallback(async () => {
    const data = await getQuotes();
    setQuotes(data);
    bump();
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshJobs(), refreshQuotes()]);
    setLoading(false);
  }, [refreshJobs, refreshQuotes]);

  // Initial load
  useEffect(() => { refreshAll(); }, [refreshAll]);

  const addCost = useCallback(async (quoteId: string, cost: Parameters<typeof storageSaveCost>[1]) => {
    const result = await storageSaveCost(quoteId, cost);
    await refreshQuotes();
    return result;
  }, [refreshQuotes]);

  const removeCost = useCallback(async (quoteId: string, costId: string) => {
    await storageDeleteCost(quoteId, costId);
    await refreshQuotes();
  }, [refreshQuotes]);

  const changeQuoteStatus = useCallback(async (quoteId: string, newStatus: QuoteStatus) => {
    // Find current quote
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;

    const prevStatus = quote.status || 'orcado';
    await saveQuoteStatus(quoteId, newStatus);

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

      await storageAddJob({
        clientName: quote.clientName,
        description: `Orçamento aprovado — ${quote.jobType || 'Vidraçaria'}`,
        saleValue: quote.total,
        status: 'em_andamento',
        items: jobItems,
      });

      await refreshJobs();
    }

    await refreshQuotes();
  }, [quotes, refreshJobs, refreshQuotes]);

  const removeJob = useCallback(async (jobId: string) => {
    await storageDeleteJob(jobId);
    await refreshAll();
  }, [refreshAll]);

  const removeQuote = useCallback(async (quoteId: string) => {
    await storageDeleteQuote(quoteId);
    await refreshAll();
  }, [refreshAll]);

  return (
    <DataContext.Provider value={{ jobs, quotes, loading, refreshAll, refreshQuotes, refreshJobs, addCost, removeCost, changeQuoteStatus, removeJob, removeQuote, lastUpdate }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
