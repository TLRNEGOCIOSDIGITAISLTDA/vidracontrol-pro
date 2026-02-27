import { Job, Expense } from './types';

const STORAGE_KEY = 'vidraceiro-jobs';

export function getJobs(): Job[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveJobs(jobs: Job[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export function addJob(job: Omit<Job, 'id' | 'createdAt' | 'expenses'>): Job {
  const jobs = getJobs();
  const newJob: Job = {
    ...job,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    expenses: [],
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
