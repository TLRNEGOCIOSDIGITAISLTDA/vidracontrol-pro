import { supabase } from "@/integrations/supabase/client";
import { Job, Expense, Quote, CompanyInfo, QuoteCost, JobItem, QuoteItem, UserProfile, Product, ProductCategory, JobPayment, PaymentMethod } from './types';

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
  const uid = await getUserId();                          // [SEC] filtro explícito
  const { data: rows, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error || !rows) return [];

  const quoteIds = rows.map(r => r.id);

  const [{ data: items }, { data: costs }] = await Promise.all([
    supabase.from('quote_items').select('*').in('quote_id', quoteIds.length ? quoteIds : ['']),
    supabase.from('quote_costs').select('*').in('quote_id', quoteIds.length ? quoteIds : ['']),
  ]);

  const result = rows.map(r => ({
    id: r.id,
    quoteNumber: (r as any).quote_number || undefined,
    clientName: r.client_name,
    clientPhone: (r as any).client_phone || '',
    jobType: r.job_type || '',
    total: Number(r.total),
    companyInfo: (() => {
      const ci = (r.company_info as any) || {};
      return { name: ci.name || '', cnpjCpf: ci.cnpjCpf || '', phone: ci.phone || '', email: ci.email || '', address: ci.address || '', logoUrl: ci.logoUrl, website: ci.website };
    })(),
    createdAt: r.created_at,
    notes: r.notes || undefined,
    status: (r.status as any) || 'orcado',
    commission: (r.company_info as any)?._commission ? Number((r.company_info as any)._commission) : undefined,
    nfPercent: (r.company_info as any)?._nfPct ? Number((r.company_info as any)._nfPct) : undefined,
    rtName: (r as any).rt_name || undefined,
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

  // Backfill em memória para orçamentos sem quote_number (migration ainda não aplicada)
  const yr = (d: string) => new Date(d).getFullYear().toString().slice(-2);
  const byYear: Record<string, typeof result> = {};
  result.forEach(q => {
    const y = yr(q.createdAt);
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(q);
  });
  Object.entries(byYear).forEach(([year, qs]) => {
    const taken = new Set<number>();
    qs.forEach(q => {
      if (q.quoteNumber) {
        const parts = q.quoteNumber.split('/');
        if (parts.length === 2 && parts[1] === year) {
          const n = parseInt(parts[0]);
          if (!isNaN(n)) taken.add(n);
        }
      }
    });
    const needsNumber = qs
      .filter(q => !q.quoteNumber)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let next = 1;
    needsNumber.forEach(q => {
      while (taken.has(next)) next++;
      q.quoteNumber = `${next.toString().padStart(3, '0')}/${year}`;
      taken.add(next);
      next++;
    });
  });

  return result;
}

export async function getQuote(id: string): Promise<Quote | undefined> {
  const quotes = await getQuotes();
  return quotes.find(q => q.id === id);
}

export async function addQuote(quote: Omit<Quote, 'id' | 'createdAt'>): Promise<Quote> {
  const uid = await getUserId();

  // Gera número sequencial: 001/26, 002/26...
  const year = new Date().getFullYear().toString().slice(-2);
  const { data: existingNums } = await supabase
    .from('quotes')
    .select('quote_number')
    .eq('user_id', uid) as any;
  const maxNum = ((existingNums as any[]) || []).reduce((max: number, row: any) => {
    if (!row.quote_number) return max;
    const parts = String(row.quote_number).split('/');
    if (parts.length !== 2 || parts[1] !== year) return max;
    const num = parseInt(parts[0]);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  const quoteNumber = `${(maxNum + 1).toString().padStart(3, '0')}/${year}`;

  const { data: row, error } = await supabase.from('quotes').insert({
    client_name: quote.clientName,
    client_phone: quote.clientPhone || '',
    job_type: quote.jobType || null,
    total: quote.total,
    notes: quote.notes || null,
    status: quote.status || 'orcado',
    quote_number: quoteNumber,
    company_info: {
      ...quote.companyInfo,
      ...(quote.commission ? { _commission: quote.commission } : {}),
      ...(quote.nfPercent ? { _nfPct: quote.nfPercent } : {}),
    } as any,
    rt_name: quote.rtName || null,
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

  await logAudit('create', 'quote', row.id, { clientName: quote.clientName, quoteNumber });
  return { ...quote, id: row.id, quoteNumber, createdAt: row.created_at, costs: [] } as Quote;
}

export async function deleteQuote(id: string) {
  const uid = await getUserId();                          // [SEC] valida dono
  await supabase.from('quotes').delete().eq('id', id).eq('user_id', uid);
  await logAudit('delete', 'quote', id);
}

export async function saveQuoteStatus(quoteId: string, status: string) {
  const uid = await getUserId();                          // [SEC] valida dono
  await supabase.from('quotes').update({ status }).eq('id', quoteId).eq('user_id', uid);
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
  const uid = await getUserId();                          // [SEC] valida dono
  await supabase.from('quote_costs').delete().eq('id', costId).eq('user_id', uid);
  await logAudit('delete', 'quote_cost', costId, { quoteId });
}

// ---- Jobs ----

export async function getJobs(): Promise<Job[]> {
  const uid = await getUserId();                          // [SEC] filtro explícito
  const { data: rows } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', uid)
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
  const uid = await getUserId();                          // [SEC] valida dono
  const update: any = {};
  if (data.clientName !== undefined) update.client_name = data.clientName;
  if (data.description !== undefined) update.description = data.description;
  if (data.saleValue !== undefined) update.sale_value = data.saleValue;
  if (data.status !== undefined) update.status = data.status;

  await supabase.from('jobs').update(update).eq('id', id).eq('user_id', uid);
  await logAudit('update', 'job', id, update);
  return await getJob(id) || null;
}

export async function deleteJob(id: string) {
  const uid = await getUserId();                          // [SEC] valida dono
  await supabase.from('jobs').delete().eq('id', id).eq('user_id', uid);
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

// ---- Job Payments ----

export async function getAllJobPaymentsTotal(): Promise<number> {
  const uid = await getUserId();                          // [SEC] filtro explícito
  const { data } = await supabase
    .from('job_payments' as any)
    .select('amount')
    .eq('user_id', uid);
  return (data || []).reduce((s: number, r: any) => s + Number(r.amount), 0);
}

export async function getJobPayments(jobId: string): Promise<JobPayment[]> {
  const { data } = await supabase
    .from('job_payments' as any)
    .select('*')
    .eq('job_id', jobId)
    .order('payment_date', { ascending: false });
  return (data || []).map((r: any) => ({
    id: r.id,
    jobId: r.job_id,
    amount: Number(r.amount),
    paymentDate: r.payment_date,
    paymentMethod: r.payment_method as PaymentMethod,
    notes: r.notes || undefined,
    createdAt: r.created_at,
  }));
}

export async function addJobPayment(
  jobId: string,
  payment: Omit<JobPayment, 'id' | 'jobId' | 'createdAt'>
): Promise<JobPayment | null> {
  const uid = await getUserId();
  const { data, error } = await supabase
    .from('job_payments' as any)
    .insert({
      job_id: jobId,
      user_id: uid,
      amount: payment.amount,
      payment_date: payment.paymentDate,
      payment_method: payment.paymentMethod,
      notes: payment.notes || null,
    } as any)
    .select()
    .single();
  if (error || !data) return null;
  const r = data as any;
  await logAudit('create', 'job_payment', r.id, { jobId, amount: payment.amount });
  return {
    id: r.id,
    jobId: r.job_id,
    amount: Number(r.amount),
    paymentDate: r.payment_date,
    paymentMethod: r.payment_method,
    notes: r.notes || undefined,
    createdAt: r.created_at,
  };
}

export async function deleteJobPayment(paymentId: string): Promise<void> {
  const uid = await getUserId();                          // [SEC] valida dono
  await supabase.from('job_payments' as any).delete().eq('id', paymentId).eq('user_id', uid);
  await logAudit('delete', 'job_payment', paymentId);
}

export async function deleteExpense(jobId: string, expenseId: string) {
  const uid = await getUserId();                          // [SEC] valida dono
  await supabase.from('job_expenses').delete().eq('id', expenseId).eq('user_id', uid);
  await logAudit('delete', 'expense', expenseId, { jobId });
}

// ---- Company Info ----

function parseAddressFields(address: string): import('./types').AddressFields | undefined {
  try {
    const parsed = JSON.parse(address);
    if (parsed && typeof parsed === 'object' && 'street' in parsed) return parsed;
  } catch { /* not JSON */ }
  return undefined;
}

function formatAddress(fields: import('./types').AddressFields): string {
  const parts: string[] = [];
  if (fields.street && fields.number) parts.push(`${fields.street}, ${fields.number}`);
  else if (fields.street) parts.push(fields.street);
  if (fields.neighborhood) parts.push(fields.neighborhood);
  const cityState = [fields.city, fields.state].filter(Boolean).join(' - ');
  if (cityState) parts.push(cityState);
  if (fields.cep) parts.push(`CEP: ${fields.cep}`);
  return parts.join(', ');
}

export async function getCompanyInfo(): Promise<CompanyInfo> {
  const uid = await getUserId();                          // [SEC] filtro explícito
  const def: CompanyInfo = { name: '', cnpjCpf: '', phone: '', email: '', address: '' };
  const { data } = await supabase.from('company_info').select('*').eq('user_id', uid).limit(1).single();
  if (!data) return def;
  const d = data as any;
  const addressFields = parseAddressFields(d.address || '');
  return {
    name: d.name,
    cnpjCpf: d.cnpj_cpf,
    phone: d.phone,
    email: d.email,
    address: addressFields ? formatAddress(addressFields) : (d.address || ''),
    website: d.website || undefined,
    logoUrl: d.logo_url || undefined,
    addressFields,
  };
}

export async function saveCompanyInfo(info: CompanyInfo) {
  const uid = await getUserId();
  const addressToStore = info.addressFields
    ? JSON.stringify(info.addressFields)
    : info.address;
  const baseData = {
    name: info.name,
    cnpj_cpf: info.cnpjCpf,
    phone: info.phone,
    email: info.email,
    address: addressToStore,
    logo_url: info.logoUrl || null,
  };
  const withWebsite = { ...baseData, website: info.website || null };

  // [SEC] sempre filtra por user_id ao buscar o registro existente
  const { data: existing } = await supabase.from('company_info').select('id').eq('user_id', uid).limit(1).single();
  if (existing) {
    const { error } = await supabase.from('company_info').update(withWebsite as any).eq('id', existing.id).eq('user_id', uid);
    if (error) await supabase.from('company_info').update(baseData).eq('id', existing.id).eq('user_id', uid);
  } else {
    const { error } = await supabase.from('company_info').insert({ ...withWebsite, user_id: uid } as any);
    if (error) await supabase.from('company_info').insert({ ...baseData, user_id: uid });
  }
}

export async function uploadCompanyLogo(file: File): Promise<string | null> {
  try {
    const uid = await getUserId();
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${uid}-logo.${ext}`;
    const { error } = await supabase.storage
      .from('company-logos')
      .upload(fileName, file, { upsert: true, contentType: file.type });
    if (error) return null;
    const { data } = supabase.storage.from('company-logos').getPublicUrl(fileName);
    return data.publicUrl;
  } catch {
    return null;
  }
}

// ---- User Profile ----

export async function getProfile(): Promise<UserProfile | null> {
  const uid = await getUserId();                          // [SEC] filtro explícito
  const { data } = await supabase.from('profiles' as any).select('*').eq('user_id', uid).limit(1).single();
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
    } as any).eq('id', (existing as any).id).eq('user_id', uid);      // [SEC] duplo filtro
  } else {
    await supabase.from('profiles' as any).insert({
      user_id: uid,
      whatsapp: profile.whatsapp,
      full_name: profile.fullName,
    } as any);
  }
}

// ---- Products ----

function rowToProduct(r: any): Product {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    unit: r.unit,
    unitPrice: Number(r.unit_price),
    category: r.category as ProductCategory,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getProducts(includeInactive = false): Promise<Product[]> {
  const uid = await getUserId();                          // [SEC] filtro explícito
  let query = supabase.from('products' as any).select('*').eq('user_id', uid).order('name');
  if (!includeInactive) query = query.eq('active', true);
  const { data } = await query;
  return (data || []).map(rowToProduct);
}

export async function addProduct(product: Omit<Product, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  const uid = await getUserId();
  const { data, error } = await supabase.from('products' as any).insert({
    user_id: uid,
    name: product.name,
    unit: product.unit,
    unit_price: product.unitPrice,
    category: product.category,
    active: product.active,
  } as any).select().single();
  if (error || !data) throw new Error(error?.message || 'Erro ao criar produto');
  await logAudit('create', 'product', (data as any).id, { name: product.name });
  return rowToProduct(data);
}

export async function updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  const uid = await getUserId();                          // [SEC] valida dono
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.unit !== undefined) payload.unit = updates.unit;
  if (updates.unitPrice !== undefined) payload.unit_price = updates.unitPrice;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.active !== undefined) payload.active = updates.active;
  payload.updated_at = new Date().toISOString();
  await supabase.from('products' as any).update(payload as any).eq('id', id).eq('user_id', uid);
  await logAudit('update', 'product', id, payload);
}

export async function deleteProduct(id: string): Promise<void> {
  const uid = await getUserId();                          // [SEC] valida dono
  await supabase.from('products' as any).delete().eq('id', id).eq('user_id', uid);
  await logAudit('delete', 'product', id);
}

export async function updateQuote(quote: Quote): Promise<void> {
  const uid = await getUserId();
  await supabase.from('quotes').update({
    client_name: quote.clientName,
    client_phone: quote.clientPhone || '',
    job_type: quote.jobType || null,
    total: quote.total,
    notes: quote.notes || null,
    company_info: {
      ...quote.companyInfo,
      ...(quote.commission ? { _commission: quote.commission } : {}),
      ...(quote.nfPercent ? { _nfPct: quote.nfPercent } : {}),
    } as any,
    rt_name: quote.rtName || null,
  }).eq('id', quote.id).eq('user_id', uid);                           // [SEC] valida dono

  // Deleta e recria os itens (sempre restringe ao user)
  await supabase.from('quote_items').delete().eq('quote_id', quote.id).eq('user_id', uid);
  if (quote.items.length > 0) {
    await supabase.from('quote_items').insert(
      quote.items.map(i => ({
        quote_id: quote.id,
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
  await logAudit('update', 'quote', quote.id, { clientName: quote.clientName });
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
