import { Job, Expense, Quote, CompanyInfo, QuoteCost, JobItem } from './types';

const STORAGE_KEY = 'vidraceiro-jobs';

export function getJobs(): Job[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveJobs(jobs: Job[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export function addJob(job: Omit<Job, 'id' | 'createdAt' | 'expenses'> & { items?: JobItem[] }): Job {
  const jobs = getJobs();
  const newJob: Job = {
    ...job,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    expenses: [],
    items: job.items || [],
  };
  jobs.unshift(newJob);
  saveJobs(jobs);
  return newJob;
}

export function updateJob(id: string, data: Partial<Job>): Job | null {
  const jobs = getJobs();
  const idx = jobs.findIndex(j => j.id === id);
  if (idx === -1) return null;
  jobs[idx] = { ...jobs[idx], ...data };
  saveJobs(jobs);
  return jobs[idx];
}

export function deleteJob(id: string) {
  const jobs = getJobs().filter(j => j.id !== id);
  saveJobs(jobs);
}

export function addExpense(jobId: string, expense: Omit<Expense, 'id' | 'jobId' | 'createdAt'>): Expense | null {
  const jobs = getJobs();
  const job = jobs.find(j => j.id === jobId);
  if (!job) return null;
  const newExpense: Expense = {
    ...expense,
    id: crypto.randomUUID(),
    jobId,
    createdAt: new Date().toISOString(),
  };
  job.expenses.push(newExpense);
  saveJobs(jobs);
  return newExpense;
}

export function deleteExpense(jobId: string, expenseId: string) {
  const jobs = getJobs();
  const job = jobs.find(j => j.id === jobId);
  if (!job) return;
  job.expenses = job.expenses.filter(e => e.id !== expenseId);
  saveJobs(jobs);
}

export function getJob(id: string): Job | undefined {
  return getJobs().find(j => j.id === id);
}

// ---- Company Info ----
const COMPANY_KEY = 'vidraceiro-company';

export function getCompanyInfo(): CompanyInfo {
  const data = localStorage.getItem(COMPANY_KEY);
  return data ? JSON.parse(data) : { name: '', cnpjCpf: '', phone: '', email: '', address: '' };
}

export function saveCompanyInfo(info: CompanyInfo) {
  localStorage.setItem(COMPANY_KEY, JSON.stringify(info));
}

// ---- Quotes ----
const QUOTES_KEY = 'vidraceiro-quotes';

export function getQuotes(): Quote[] {
  const data = localStorage.getItem(QUOTES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveQuotes(quotes: Quote[]) {
  localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}

export function addQuote(quote: Omit<Quote, 'id' | 'createdAt'>): Quote {
  const quotes = getQuotes();
  const newQuote: Quote = {
    ...quote,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  quotes.unshift(newQuote);
  saveQuotes(quotes);
  return newQuote;
}

export function getQuote(id: string): Quote | undefined {
  return getQuotes().find(q => q.id === id);
}

export function deleteQuote(id: string) {
  const quotes = getQuotes().filter(q => q.id !== id);
  saveQuotes(quotes);
}

// ---- Quote Costs ----
export function addQuoteCost(quoteId: string, cost: Omit<QuoteCost, 'id' | 'quoteId' | 'createdAt'>): QuoteCost | null {
  const quotes = getQuotes();
  const quote = quotes.find(q => q.id === quoteId);
  if (!quote) return null;
  const newCost: QuoteCost = {
    ...cost,
    id: crypto.randomUUID(),
    quoteId,
    createdAt: new Date().toISOString(),
  };
  if (!quote.costs) quote.costs = [];
  quote.costs.push(newCost);
  saveQuotes(quotes);
  return newCost;
}

export function deleteQuoteCost(quoteId: string, costId: string) {
  const quotes = getQuotes();
  const quote = quotes.find(q => q.id === quoteId);
  if (!quote || !quote.costs) return;
  quote.costs = quote.costs.filter(c => c.id !== costId);
  saveQuotes(quotes);
}

// ---- Clear all data (keeps company info & catalog) ----
export function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);   // jobs
  localStorage.removeItem(QUOTES_KEY);    // quotes
}
