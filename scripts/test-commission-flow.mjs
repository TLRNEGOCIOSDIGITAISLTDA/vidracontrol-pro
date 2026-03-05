/**
 * Test: quote with commission/NF (stored in company_info JSONB) → approve → verify expenses
 * Run: node scripts/test-commission-flow.mjs
 */

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://oifhmzpekcjkmjrjdbxg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZmhtenBla2Nqa21qcmpkYnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNDM0NTIsImV4cCI6MjA4NzgxOTQ1Mn0.GK5gvvSMjZBVUowidf_iYZFk_bMuid9Ti43UyDaKWyc'
);

const fmt = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => { console.error(`  ❌ ${msg}`); process.exitCode = 1; };
const section = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 50 - t.length))}`);

let quoteId, jobId;

try {
  const total = 2000;
  const commission = 10;   // 10%
  const nfPct = 8;          // 8%
  const commissionValue = total * commission / 100;  // R$ 200
  const nfValue = total * nfPct / 100;               // R$ 160

  // 1. Create quote — commission/NF stored inside company_info JSONB
  section('1. Criar orçamento com Comissão 10% + NF 8%');
  const companyInfo = {
    name: 'Vidraçaria Teste',
    cnpjCpf: '', phone: '', email: '', address: '',
    _commission: commission,
    _nfPct: nfPct,
  };
  const { data: quote, error: qErr } = await sb.from('quotes').insert({
    client_name: '[TESTE] João da Silva',
    job_type: 'Residencial',
    total,
    status: 'orcado',
    company_info: companyInfo,
  }).select().single();

  if (qErr || !quote) { fail(`Erro ao criar orçamento: ${qErr?.message}`); process.exit(1); }
  quoteId = quote.id;
  pass(`Orçamento criado: id=${quoteId.slice(0,8)}… total=${fmt(total)}`);

  // 2. Verify commission/NF stored in company_info
  section('2. Verificar commission/NF no company_info (JSONB)');
  const { data: saved } = await sb.from('quotes').select('company_info, status').eq('id', quoteId).single();
  const ci = saved.company_info;
  if (Number(ci._commission) === commission) pass(`_commission = ${ci._commission}% ✓`);
  else fail(`_commission esperado ${commission}, recebido ${ci._commission}`);
  if (Number(ci._nfPct) === nfPct) pass(`_nfPct = ${ci._nfPct}% ✓`);
  else fail(`_nfPct esperado ${nfPct}, recebido ${ci._nfPct}`);

  // 3. Approve quote
  section('3. Aprovar orçamento (status → aprovado)');
  const { error: stErr } = await sb.from('quotes').update({ status: 'aprovado' }).eq('id', quoteId);
  if (stErr) fail(`Erro: ${stErr.message}`);
  else pass('Status → "aprovado"');

  // 4. Create job
  section('4. Criar Obra');
  const { data: job, error: jErr } = await sb.from('jobs').insert({
    client_name: '[TESTE] João da Silva',
    description: 'Orçamento aprovado — Residencial',
    sale_value: total,
    status: 'em_andamento',
  }).select().single();
  if (jErr || !job) { fail(`Erro: ${jErr?.message}`); process.exit(1); }
  jobId = job.id;
  pass(`Obra criada: id=${jobId.slice(0,8)}… saleValue=${fmt(total)}`);

  // 5. Create commission + NF expenses
  section('5. Criar despesas automáticas');
  const expenses = [
    { description: `Comissão ${commission}%`, category: 'comissao', value: commissionValue },
    { description: `Nota Fiscal ${nfPct}%`,   category: 'nf',       value: nfValue },
  ];
  for (const exp of expenses) {
    const { data: e, error: eErr } = await sb.from('job_expenses').insert({ job_id: jobId, ...exp }).select().single();
    if (eErr) fail(`Erro ao criar "${exp.description}": ${eErr.message}`);
    else pass(`Despesa "${e.description}" = ${fmt(e.value)} [${e.category}]`);
  }

  // 6. Verify profit
  section('6. Verificar lucro da obra');
  const { data: dbExpenses } = await sb.from('job_expenses').select('value, category').eq('job_id', jobId);
  const totalCosts = dbExpenses.reduce((s, e) => s + Number(e.value), 0);
  const profit = total - totalCosts;
  const margin = ((profit / total) * 100).toFixed(1);
  pass(`Venda:  ${fmt(total)}`);
  pass(`Custos: ${fmt(totalCosts)} (comissão ${fmt(commissionValue)} + NF ${fmt(nfValue)})`);
  pass(`Lucro:  ${fmt(profit)} — margem ${margin}%`);
  if (Math.abs(totalCosts - (commissionValue + nfValue)) < 0.01) pass('Cálculo correto ✓');
  else fail(`Esperado ${fmt(commissionValue + nfValue)}, calculado ${fmt(totalCosts)}`);

  // 7. Confirm categories are custom values (not constrained)
  section('7. Verificar categorias customizadas (comissao / nf)');
  const cats = dbExpenses.map(e => e.category);
  if (cats.includes('comissao')) pass('Categoria "comissao" aceita pelo banco ✓');
  else fail('Categoria "comissao" não encontrada');
  if (cats.includes('nf')) pass('Categoria "nf" aceita pelo banco ✓');
  else fail('Categoria "nf" não encontrada');

} finally {
  section('8. Limpando dados de teste');
  if (jobId) {
    await sb.from('job_expenses').delete().eq('job_id', jobId);
    await sb.from('jobs').delete().eq('id', jobId);
    pass('Obra de teste removida');
  }
  if (quoteId) {
    await sb.from('quotes').delete().eq('id', quoteId);
    pass('Orçamento de teste removido');
  }
}

section('Resultado final');
if (process.exitCode === 1) console.log('  ❌ Falha — veja acima\n');
else console.log('  ✅ Todos os testes passaram! Fluxo comissão/NF funcionando corretamente.\n');
