import { supabase } from "@/integrations/supabase/client";
import { Job, Expense, Quote, CompanyInfo, QuoteCost, JobItem, QuoteItem, UserProfile } from './types';

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// ---- Audit helper ----
export async function logAudit(action: string, entityType?: string, entityId?: string, details?: Record<string, unknown>) {
  try {
    const uid = await getUserId();
    await supabase.from('audit_logs' as any).insert({
      user_id: uid,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      details: details || {},
    } as any);
  } catch { /* silent */ }
}

// ---- Quotes ----

export async function getQuotes(): Promise<Quote[]> {
  const { data: rows, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !rows) return [];

  const quoteIds = rows.map(r => r.id);

  const [{ data: items }, { data: costs }] = await Promise.all([
    supabase.from('quote_items').select('*').in('quote_id', quoteIds.length ? quoteIds : ['']),
    supabase.from('quote_costs').select('*').in('quote_id', quoteIds.length ? quoteIds : ['']),
  ]);

  return rows.map(r => ({
    id: r.id,
    clientName: r.client_name,
    clientPhone: (r as any).client_phone || '',
    jobType: r.job_type || '',
    total: Number(r.total),
    companyInfo: (r.company_info as unknown as CompanyInfo) || { name: '', cnpjCpf: '', phone: '', email: '', address: '' },
    createdAt: r.created_at,
    notes: r.notes || undefined,
    status: (r.status as any) || 'orcado',
    commission: (r as any).commission_pct ? Number((r as any).commission_pct) : undefined,
    nfPercent: (r as any).nf_pct ? Number((r as any).nf_pct) : undefined,
    items: (items || []).filter(i => i.quote_id === r.id).map(i => ({
      id: i.id,
      type: i.type as any,
      description: i.description,
      location: i.location || undefined,
      width: i.width ? Number(i.width) : undefined,
      height: i.height ? Number(i.height) : undefined,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      total: Number(i.total),
    })),
    costs: (costs || []).filter(c => c.quote_id === r.id).map(c => ({
      id: c.id,
      quoteId: c.quote_id,
      description: c.description,
      category: c.category as any,
      value: Number(c.value),
      date: c.date,
      createdAt: c.created_at,
    })),
  }));
}

export async function getQuote(id: string): Promise<Quote | undefined> {
  const quotes = await getQuotes();
  return quotes.find(q => q.id === id);
}

export async function addQuote(quote: Omit<Quote, 'id' | 'createdAt'>): Promise<Quote> {
  const uid = await getUserId();
  const { data: row, error } = await supabase.from('quotes').insert({
    client_name: quote.clientName,
    client_phone: quote.clientPhone || '',
    job_type: quote.jobType || null,
    total: quote.total,
    notes: quote.notes || null,
    status: quote.status || 'orcado',
    company_info: quote.companyInfo as any,
    commission_pct: quote.commission || 0,
    nf_pct: quote.nfPercent || 0,
    user_id: uid,
  } as any).select().single();

  if (error || !row) throw new Error(error?.message || 'Failed to create quote');

  if (quote.items.length > 0) {
    await supabase.from('quote_items').insert(
      quote.items.map(i => ({
        quote_id: row.id,
        type: i.type,
        description: i.description,
        location: i.location || null,
        width: i.width || null,
        height: i.height || null,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        total: i.total,
        user_id: uid,
      }))
    );
  }

  await logAudit('create', 'quote', row.id, { clientName: quote.clientName });
  return { ...quote, id: row.id, createdAt: row.created_at, costs: [] } as Quote;
}

export async function deleteQuote(id: string) {
  await supabase.from('quotes').delete().eq('id', id);
  await logAudit('delete', 'quote', id);
}

export async function saveQuoteStatus(quoteId: string, status: string) {
  await supabase.from('quotes').update({ status }).eq('id', quoteId);
  await logAudit('update_status', 'quote', quoteId, { status });
}

// ---- Quote Costs ----

export async function addQuoteCost(quoteId: string, cost: Omit<QuoteCost, 'id' | 'quoteId' | 'createdAt'>): Promise<QuoteCost | null> {
  const uid = await getUserId();
  const { data, error } = await supabase.from('quote_costs').insert({
    quote_id: quoteId,
    description: cost.description,
    category: cost.category,
    value: cost.value,
    date: cost.date,
    user_id: uid,
  }).select().single();

  if (error || !data) return null;
  await logAudit('create', 'quote_cost', data.id, { quoteId, value: cost.value });
  return {
    id: data.id,
    quoteId: data.quote_id,
    description: data.description,
    category: data.category as any,
    value: Number(data.value),
    date: data.date,
    createdAt: data.created_at,
  };
}

export async function deleteQuoteCost(quoteId: string, costId: string) {
  await supabase.from('quote_costs').delete().eq('id', costId);
  await logAudit('delete', 'quote_cost', costId, { quoteId });
}

// ---- Jobs ----

export async function getJobs(): Promise<Job[]> {
  const { data: rows } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });
  if (!rows) return [];

  const jobIds = rows.map(r => r.id);

  const [{ data: items }, { data: expenses }] = await Promise.all([
    supabase.from('job_items').select('*').in('job_id', jobIds.length ? jobIds : ['']),
    supabase.from('job_expenses').select('*').in('job_id', jobIds.length ? jobIds : ['']),
  ]);

  return rows.map(r => ({
    id: r.id,
    clientName: r.client_name,
    description: r.description,
    saleValue: Number(r.sale_value),
    status: r.status as any,
    createdAt: r.created_at,
    items: (items || []).filter(i => i.job_id === r.id).map(i => ({
      id: i.id,
      type: i.type as any,
      description: i.description,
      width: i.width ? Number(i.width) : undefined,
      height: i.height ? Number(i.height) : undefined,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      total: Number(i.total),
      area: i.area ? Number(i.area) : undefined,
    })),
    expenses: (expenses || []).filter(e => e.job_id === r.id).map(e => ({
      id: e.id,
      jobId: e.job_id,
      description: e.description,
      category: e.category as any,
      value: Number(e.value),
      photoUrl: e.photo_url || undefined,
      createdAt: e.created_at,
    })),
  }));
}

export async function getJob(id: string): Promise<Job | undefined> {
  const jobs = await getJobs();
  return jobs.find(j => j.id === id);
}

export async function addJob(job: Omit<Job, 'id' | 'createdAt' | 'expenses'> & { items?: JobItem[] }): Promise<Job> {
  const uid = await getUserId();
  const { data: row, error } = await supabase.from('jobs').insert({
    client_name: job.clientName,
    description: job.description,
    sale_value: job.saleValue,
    status: job.status,
    user_id: uid,
  }).select().single();

  if (error || !row) throw new Error(error?.message || 'Failed to create job');

  if (job.items && job.items.length > 0) {
    await supabase.from('job_items').insert(
      job.items.map(i => ({
        job_id: row.id,
        type: i.type,
        description: i.description,
        width: i.width || null,
        height: i.height || null,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        total: i.total,
        area: i.area || null,
        user_id: uid,
      }))
    );
  }

  await logAudit('create', 'job', row.id, { clientName: job.clientName });
  return {
    ...job,
    id: row.id,
    createdAt: row.created_at,
    expenses: [],
    items: job.items || [],
  };
}

export async function updateJob(id: string, data: Partial<Job>): Promise<Job | null> {
  const update: any = {};
  if (data.clientName !== undefined) update.client_name = data.clientName;
  if (data.description !== undefined) update.description = data.description;
  if (data.saleValue !== undefined) update.sale_value = data.saleValue;
  if (data.status !== undefined) update.status = data.status;

  await supabase.from('jobs').update(update).eq('id', id);
  await logAudit('update', 'job', id, update);
  return await getJob(id) || null;
}

export async function deleteJob(id: string) {
  await supabase.from('jobs').delete().eq('id', id);
  await logAudit('delete', 'job', id);
}

export async function addExpense(jobId: string, expense: Omit<Expense, 'id' | 'jobId' | 'createdAt'>): Promise<Expense | null> {
  const uid = await getUserId();
  const { data, error } = await supabase.from('job_expenses').insert({
    job_id: jobId,
    description: expense.description,
    category: expense.category,
    value: expense.value,
    photo_url: expense.photoUrl || null,
    user_id: uid,
  }).select().single();

  if (error || !data) return null;
  await logAudit('create', 'expense', data.id, { jobId, value: expense.value });
  return {
    id: data.id,
    jobId: data.job_id,
    description: data.description,
    category: data.category as any,
    value: Number(data.value),
    photoUrl: data.photo_url || undefined,
    createdAt: data.created_at,
  };
}

export async function deleteExpense(jobId: string, expenseId: string) {
  await supabase.from('job_expenses').delete().eq('id', expenseId);
  await logAudit('delete', 'expense', expenseId, { jobId });
}

// ---- Company Info ----

export async function getCompanyInfo(): Promise<CompanyInfo> {
  const def: CompanyInfo = { name: '', cnpjCpf: '', phone: '', email: '', address: '' };
  const { data } = await supabase.from('company_info').select('*').limit(1).single();
  if (!data) return def;
  return {
    name: data.name,
    cnpjCpf: data.cnpj_cpf,
    phone: data.phone,
    email: data.email,
    address: data.address,
    logoUrl: data.logo_url || undefined,
  };
}

export async function saveCompanyInfo(info: CompanyInfo) {
  const uid = await getUserId();
  const { data: existing } = await supabase.from('company_info').select('id').limit(1).single();
  if (existing) {
    await supabase.from('company_info').update({
      name: info.name,
      cnpj_cpf: info.cnpjCpf,
      phone: info.phone,
      email: info.email,
      address: info.address,
      logo_url: info.logoUrl || null,
    }).eq('id', existing.id);
  } else {
    await supabase.from('company_info').insert({
      name: info.name,
      cnpj_cpf: info.cnpjCpf,
      phone: info.phone,
      email: info.email,
      address: info.address,
      logo_url: info.logoUrl || null,
      user_id: uid,
    });
  }
}

// ---- User Profile ----

export async function getProfile(): Promise<UserProfile | null> {
  const { data } = await supabase.from('profiles' as any).select('*').limit(1).single();
  if (!data) return null;
  const d = data as any;
  return { id: d.id, userId: d.user_id, whatsapp: d.whatsapp, fullName: d.full_name };
}

export async function saveProfile(profile: { whatsapp: string; fullName: string }) {
  const uid = await getUserId();
  const { data: existing } = await supabase.from('profiles' as any).select('id').eq('user_id', uid).limit(1).single();
  if (existing) {
    await supabase.from('profiles' as any).update({
      whatsapp: profile.whatsapp,
      full_name: profile.fullName,
      updated_at: new Date().toISOString(),
    } as any).eq('id', (existing as any).id);
  } else {
    await supabase.from('profiles' as any).insert({
      user_id: uid,
      whatsapp: profile.whatsapp,
      full_name: profile.fullName,
    } as any);
  }
}

// ---- Clear all data ----
export async function clearAllData() {
  const uid = await getUserId();
  await Promise.all([
    supabase.from('quote_costs').delete().eq('user_id', uid),
    supabase.from('quote_items').delete().eq('user_id', uid),
    supabase.from('job_expenses').delete().eq('user_id', uid),
    supabase.from('job_items').delete().eq('user_id', uid),
  ]);
  await Promise.all([
    supabase.from('quotes').delete().eq('user_id', uid),
    supabase.from('jobs').delete().eq('user_id', uid),
  ]);
}
