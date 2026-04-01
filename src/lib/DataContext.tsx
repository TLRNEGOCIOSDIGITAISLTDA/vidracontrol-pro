import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Job, Quote, QuoteStatus, JobItem } from "./types";
import {
  getJobs,
  getQuotes,
  getAllJobPaymentsTotal,
  addJob as storageAddJob,
  addExpense as storageAddExpense,
  addQuoteCost as storageSaveCost,
  deleteQuoteCost as storageDeleteCost,
  deleteJob as storageDeleteJob,
  deleteQuote as storageDeleteQuote,
  saveQuoteStatus,
  updateQuote as storageUpdateQuote,
} from "./storage";
import { supabase } from "@/integrations/supabase/client";

interface DataContextType {
  jobs: Job[];
  quotes: Quote[];
  totalReceived: number;
  loading: boolean;
  refreshAll: () => Promise<void>;
  refreshQuotes: () => Promise<void>;
  refreshJobs: () => Promise<void>;
  addCost: (quoteId: string, cost: Parameters<typeof storageSaveCost>[1]) => Promise<Awaited<ReturnType<typeof storageSaveCost>>>;
  removeCost: (quoteId: string, costId: string) => Promise<void>;
  changeQuoteStatus: (quoteId: string, newStatus: QuoteStatus) => Promise<void>;
  updateQuote: (quote: Quote) => Promise<void>;
  removeJob: (jobId: string) => Promise<void>;
  removeQuote: (quoteId: string) => Promise<void>;
  lastUpdate: number;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [totalReceived, setTotalReceived] = useState(0);
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
    const [, , total] = await Promise.all([refreshJobs(), refreshQuotes(), getAllJobPaymentsTotal()]);
    setTotalReceived(total);
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
    // Find current quote in local state (for item data)
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;

    // Read current status DIRECTLY from DB to avoid stale state causing duplicate job creation
    const { data: { user } } = await supabase.auth.getUser();
    const { data: dbRow } = await supabase.from('quotes').select('status').eq('id', quoteId).eq('user_id', user?.id).single();
    const prevStatus = (dbRow?.status as QuoteStatus) || 'orcado';

    await saveQuoteStatus(quoteId, newStatus);

    // When moving to "aprovado", auto-create a Job — only if not already aprovado in DB
    if (newStatus === 'aprovado' && prevStatus !== 'aprovado') {
      const jobItems: JobItem[] = quote.items.map(item => ({
        id: crypto.randomUUID(),
        type: item.type,
        description: item.description,
        width: item.width,
        height: item.height,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        area: item.width && item.height ? item.width * item.height / 1_000_000 * item.quantity : undefined,
      }));

      const newJob = await storageAddJob({
        clientName: quote.clientName,
        description: `Orçamento aprovado — ${quote.jobType || 'Vidraçaria'}`,
        saleValue: quote.total,
        status: 'em_andamento',
        items: jobItems,
        quoteId: quoteId,
      });

      // Auto-create commission and NF expenses if defined on the quote
      if (quote.commission && quote.commission > 0) {
        await storageAddExpense(newJob.id, {
          description: `Comissão ${quote.commission}%`,
          category: 'comissao',
          value: Math.round(quote.total * quote.commission) / 100,
          photoUrl: undefined,
        });
      }
      if (quote.nfPercent && quote.nfPercent > 0) {
        await storageAddExpense(newJob.id, {
          description: `Nota Fiscal ${quote.nfPercent}%`,
          category: 'nf',
          value: Math.round(quote.total * quote.nfPercent) / 100,
          photoUrl: undefined,
        });
      }

      await refreshJobs();
    }

    await refreshQuotes();
  }, [quotes, refreshJobs, refreshQuotes]); // `quotes` still needed to get item data for job creation

  const updateQuote = useCallback(async (quote: Quote) => {
    await storageUpdateQuote(quote);
    // Refresh tanto orçamentos quanto obras: updateQuote sincroniza saleValue da obra vinculada
    await Promise.all([refreshQuotes(), refreshJobs()]);
  }, [refreshQuotes, refreshJobs]);

  const removeJob = useCallback(async (jobId: string) => {
    await storageDeleteJob(jobId);
    await refreshAll();
  }, [refreshAll]);

  const removeQuote = useCallback(async (quoteId: string) => {
    await storageDeleteQuote(quoteId);
    await refreshAll();
  }, [refreshAll]);

  return (
    <DataContext.Provider value={{ jobs, quotes, totalReceived, loading, refreshAll, refreshQuotes, refreshJobs, addCost, removeCost, changeQuoteStatus, updateQuote, removeJob, removeQuote, lastUpdate }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
