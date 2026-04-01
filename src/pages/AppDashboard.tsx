import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Briefcase, TrendingUp, TrendingDown, DollarSign, FileText, ChevronDown, Trash2, Percent, CalendarDays, LayoutGrid, List, Wallet, Clock, PieChartIcon, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app/AppHeader";
import { useData } from "@/lib/DataContext";
import { clearAllData } from "@/lib/storage";
import { QuoteStatus, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS, QUOTE_STATUS_BG, JOB_STATUS_LABELS, JOB_STATUS_COLORS, JobStatus } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { QuoteKanban } from "@/components/app/QuoteKanban";
import { JobStepDots } from "@/components/app/JobStepDots";
import { supabase } from "@/integrations/supabase/client";

const ALL_STATUSES: QuoteStatus[] = ['orcado', 'enviado', 'aguardando', 'aprovado', 'entregue', 'perdido'];
const ALL_JOB_STATUSES: JobStatus[] = ['em_andamento', 'aguardando_pagamento', 'finalizado'];
const JOB_STATUS_HEX: Record<JobStatus, string> = {
  em_andamento: 'hsl(215,80%,55%)',
  aguardando_pagamento: '#f59e0b',
  finalizado: '#22c55e',
};

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

type Period = 'mes' | 'mes_passado' | 'ano' | 'escolher_mes';

const HighlightCard = ({ children, className = "", lastUpdate }: { children: React.ReactNode; className?: string; lastUpdate: number }) => {
  const [flash, setFlash] = useState(false);
  const mountRef = useRef(lastUpdate);

  useEffect(() => {
    if (lastUpdate !== mountRef.current) {
      mountRef.current = lastUpdate;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1000);
      return () => clearTimeout(t);
    }
  }, [lastUpdate]);

  return (
    <div className={`bg-card rounded-xl p-3 shadow-card transition-all duration-500 ${flash ? "ring-2 ring-success/50 shadow-[0_0_12px_hsl(var(--success)/0.3)]" : ""} ${className}`}>
      {children}
    </div>
  );
};

// Toggle kanban/lista reutilizável
function ViewToggle({ view, onChange }: { view: "kanban" | "list"; onChange: (v: "kanban" | "list") => void }) {
  return (
    <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5 shrink-0">
      <button
        onClick={() => onChange("kanban")}
        title="Kanban"
        className={`p-1.5 rounded-md transition-colors ${view === "kanban" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange("list")}
        title="Lista"
        className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}

const AppDashboard = () => {
  const { jobs, quotes, totalReceived, refreshAll, lastUpdate } = useData();

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // ── Filtro de período ────────────────────────────────────────
  const [period, setPeriod] = useState<Period>(
    () => (localStorage.getItem('dashPeriod') as Period) || 'mes'
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return localStorage.getItem('dashSelectedMonth') || `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
  });
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const changePeriod = (p: Period) => {
    setPeriod(p);
    localStorage.setItem('dashPeriod', p);
    if (p !== 'escolher_mes') setMonthPickerOpen(false);
  };

  const changeSelectedMonth = (key: string) => {
    setSelectedMonth(key);
    localStorage.setItem('dashSelectedMonth', key);
    setMonthPickerOpen(false);
    setPeriod('escolher_mes');
    localStorage.setItem('dashPeriod', 'escolher_mes');
  };

  const { periodStart, periodEnd } = useMemo(() => {
    const now = new Date();
    if (period === 'mes') {
      return {
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    }
    if (period === 'mes_passado') {
      return {
        periodStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        periodEnd: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      };
    }
    if (period === 'escolher_mes') {
      const [y, m] = selectedMonth.split('-').map(Number);
      return {
        periodStart: new Date(y, m, 1),
        periodEnd: new Date(y, m + 1, 0, 23, 59, 59),
      };
    }
    // ano
    return {
      periodStart: new Date(now.getFullYear(), 0, 1),
      periodEnd: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
    };
  }, [period, selectedMonth]);

  const filteredJobs = useMemo(() =>
    jobs.filter(j => {
      const d = new Date(j.createdAt);
      return d >= periodStart && d <= periodEnd;
    }), [jobs, periodStart, periodEnd]);

  const filteredQuotes = useMemo(() =>
    quotes.filter(q => {
      const d = new Date(q.createdAt);
      return d >= periodStart && d <= periodEnd;
    }), [quotes, periodStart, periodEnd]);

  // ── Obras em aberto — sempre visíveis, independente do período ──
  // Inclui em_andamento e aguardando_pagamento (obras abertas que precisam de atenção)
  const OPEN_JOB_STATUSES: JobStatus[] = ['em_andamento', 'aguardando_pagamento'];
  const jobsEmAberto = useMemo(() =>
    jobs
      .filter(j => OPEN_JOB_STATUSES.includes(j.status as JobStatus))
      .sort((a, b) => {
        // Em Andamento primeiro, depois Aguardando Pagamento; dentro de cada grupo: mais recente primeiro
        const order: Partial<Record<JobStatus, number>> = { em_andamento: 0, aguardando_pagamento: 1 };
        const oa = order[a.status as JobStatus] ?? 99;
        const ob = order[b.status as JobStatus] ?? 99;
        if (oa !== ob) return oa - ob;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [jobs] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── KPIs filtrados por período ───────────────────────────────
  const totalSales = filteredJobs.reduce((s, j) => s + j.saleValue, 0);
  const totalCosts = filteredJobs.reduce((s, j) => s + j.expenses.reduce((es, e) => es + e.value, 0), 0);
  const totalProfit = totalSales - totalCosts;
  const avgMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100) : 0;
  const conversionRate = filteredQuotes.length > 0
    ? (filteredQuotes.filter(q => (q.status || 'orcado') === 'aprovado').length / filteredQuotes.length) * 100
    : 0;

  // ── Pagamentos brutos com timestamp exato ─────────────────────
  // Armazena cada pagamento com seu created_at para filtragem precisa por período
  const [paymentsRaw, setPaymentsRaw] = useState<{ amount: number; createdAt: Date }[]>([]);
  // Também mantém agrupamento por mês para o bloco "Ver por Mês"
  const [paymentsByMonth, setPaymentsByMonth] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from('job_payments')
        .select('amount, created_at')
        .eq('user_id', user.id);
      const raw: { amount: number; createdAt: Date }[] = [];
      const map = new Map<string, number>();
      (data || []).forEach((r: any) => {
        const d = new Date(r.created_at);
        raw.push({ amount: Number(r.amount), createdAt: d });
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
        map.set(key, (map.get(key) || 0) + Number(r.amount));
      });
      setPaymentsRaw(raw);
      setPaymentsByMonth(map);
    })();
  }, [lastUpdate]);

  // Total Recebido / A Receber — filtrados pelo período via timestamp exato
  const periodReceived = useMemo(() =>
    paymentsRaw
      .filter(p => p.createdAt >= periodStart && p.createdAt <= periodEnd)
      .reduce((s, p) => s + p.amount, 0),
    [paymentsRaw, periodStart, periodEnd]
  );
  const periodPending = Math.max(0, totalSales - periodReceived);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // ── Dados de orçamentos para gráficos ───────────────────────
  const quotesByStatus = ALL_STATUSES.map((status) => {
    const filtered = filteredQuotes.filter((q) => (q.status || "orcado") === status);
    return {
      status,
      label: QUOTE_STATUS_LABELS[status],
      color: QUOTE_STATUS_COLORS[status],
      count: filtered.length,
      total: filtered.reduce((s, q) => s + q.total, 0),
      quotes: filtered,
    };
  });

  const qtyData = quotesByStatus.filter(d => d.count > 0).map(d => ({ name: d.label, value: d.count, color: d.color }));
  const valueData = quotesByStatus.filter(d => d.total > 0).map(d => ({ name: d.label, value: d.total, color: d.color }));
  const hasQuotes = filteredQuotes.length > 0;

  // ── Estado persistido ────────────────────────────────────────
  const [quotesOpen, setQuotesOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [showPieChart, setShowPieChart] = useState(
    () => localStorage.getItem("dashShowPie") !== "false"
  );
  const [quotesView, setQuotesView] = useState<"kanban" | "list">(
    () => (localStorage.getItem("dashQuotesView") as "kanban" | "list") || "kanban"
  );
  const [jobsView, setJobsView] = useState<"kanban" | "list">(
    () => (localStorage.getItem("dashJobsView") as "kanban" | "list") || "list"
  );
  // Seção "Em Aberto": toggle kanban/lista e minimizar/expandir (persistidos)
  const [andamentoView, setAndamentoView] = useState<"kanban" | "list">(
    () => (localStorage.getItem("dashAndamentoView") as "kanban" | "list") || "list"
  );
  const [andamentoOpen, setAndamentoOpen] = useState<boolean>(
    () => localStorage.getItem("dashAndamentoOpen") !== "false"
  );

  const togglePieChart = () => {
    const next = !showPieChart;
    setShowPieChart(next);
    localStorage.setItem("dashShowPie", String(next));
  };

  const monthlyData = useMemo(() => {
    const map = new Map<string, { key: string; month: string; sales: number; costs: number; count: number }>();
    const jobsByKey = new Map<string, typeof jobs>();
    const quotesByKey = new Map<string, typeof quotes>();
    jobs.forEach(j => {
      const d = new Date(j.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      if (!map.has(key)) map.set(key, { key, month: label, sales: 0, costs: 0, count: 0 });
      const entry = map.get(key)!;
      entry.sales += j.saleValue;
      entry.costs += j.expenses.reduce((s, e) => s + e.value, 0);
      entry.count += 1;
      if (!jobsByKey.has(key)) jobsByKey.set(key, []);
      jobsByKey.get(key)!.push(j);
    });
    quotes.forEach(q => {
      const d = new Date(q.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      if (!quotesByKey.has(key)) quotesByKey.set(key, []);
      quotesByKey.get(key)!.push(q);
    });
    return Array.from(map.values())
      .sort((a, b) => b.key.localeCompare(a.key))
      .map(e => {
        const received = paymentsByMonth.get(e.key) || 0;
        return {
          ...e,
          profit: e.sales - e.costs,
          margin: e.sales > 0 ? ((e.sales - e.costs) / e.sales) * 100 : 0,
          received,
          pending: Math.max(0, e.sales - received),
          monthJobs: jobsByKey.get(e.key) || [],
          monthQuotes: quotesByKey.get(e.key) || [],
        };
      });
  }, [jobs, quotes, paymentsByMonth]);

  // ── Meses disponíveis (com dados) ───────────────────────────
  const availableMonths = useMemo(() => {
    const keys = new Set<string>();
    jobs.forEach(j => {
      const d = new Date(j.createdAt);
      keys.add(`${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`);
    });
    quotes.forEach(q => {
      const d = new Date(q.createdAt);
      keys.add(`${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`);
    });
    return Array.from(keys).sort().reverse();
  }, [jobs, quotes]);

  const monthKeyToLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return `${MONTH_NAMES[m]} ${y}`;
  };

  const renderLabel = ({ percent }: { percent: number }) =>
    percent > 0 ? `${(percent * 100).toFixed(0)}%` : "";

  const PERIOD_LABELS: Record<Period, string> = {
    mes: 'Este Mês',
    mes_passado: 'Mês Passado',
    ano: 'Ano Todo',
    escolher_mes: monthKeyToLabel(selectedMonth),
  };

  // Filtra monthlyData para o período atual — consistente com periodStart/periodEnd
  const visibleMonthlyData = useMemo(() => {
    return monthlyData.filter(m => {
      const [ey, em] = m.key.split('-').map(Number);
      const monthStart = new Date(ey, em, 1);
      const monthEnd = new Date(ey, em + 1, 0, 23, 59, 59);
      return monthStart <= periodEnd && monthEnd >= periodStart;
    });
  }, [monthlyData, periodStart, periodEnd]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container px-4 py-6 space-y-6">

        {/* ── Filtro de período — controla tudo abaixo ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            {(['mes', 'mes_passado', 'ano'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => changePeriod(p)}
                className={`flex-1 text-xs font-medium py-1.5 px-1 rounded-lg transition-colors ${
                  period === p
                    ? 'bg-card shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
            <button
              onClick={() => { setMonthPickerOpen(v => !v); if (period !== 'escolher_mes') setPeriod('escolher_mes'); }}
              className={`flex-1 text-xs font-medium py-1.5 px-1 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                period === 'escolher_mes'
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays className="h-3 w-3 shrink-0" />
              <span className="truncate">{period === 'escolher_mes' ? monthKeyToLabel(selectedMonth) : 'Mês'}</span>
            </button>
          </div>

          {/* Month picker dropdown */}
          <AnimatePresence>
            {monthPickerOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-card rounded-xl shadow-card p-3 border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Selecionar mês</p>
                  {availableMonths.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Nenhum dado disponível</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {availableMonths.map(key => (
                        <button
                          key={key}
                          onClick={() => changeSelectedMonth(key)}
                          className={`text-xs py-1.5 px-2 rounded-lg text-left transition-colors ${
                            selectedMonth === key && period === 'escolher_mes'
                              ? 'bg-primary text-primary-foreground font-semibold'
                              : 'bg-muted hover:bg-muted/80 text-foreground'
                          }`}
                        >
                          {monthKeyToLabel(key)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── KPIs — em destaque: Vendas, Lucro, Recebido, A Receber ── */}
        <div>
          <p className="text-[11px] text-muted-foreground mb-2 text-center">
            KPIs de <strong>{PERIOD_LABELS[period]}</strong>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {/* Destaque principal */}
            <HighlightCard lastUpdate={lastUpdate}>
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground mb-1" />
              <div className="text-[11px] text-muted-foreground">Vendas</div>
              <div className="text-sm font-bold text-foreground leading-tight">{fmt(totalSales)}</div>
            </HighlightCard>
            <HighlightCard lastUpdate={lastUpdate}>
              <TrendingUp className="h-3.5 w-3.5 text-success mb-1" />
              <div className="text-[11px] text-muted-foreground">Lucro</div>
              <div className={`text-sm font-bold leading-tight ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}>
                {fmt(totalProfit)}
              </div>
            </HighlightCard>
            <HighlightCard lastUpdate={lastUpdate}>
              <Wallet className="h-3.5 w-3.5 text-success mb-1" />
              <div className="text-[11px] text-muted-foreground">Recebido</div>
              <div className="text-sm font-bold text-success leading-tight">{fmt(periodReceived)}</div>
            </HighlightCard>
            <HighlightCard lastUpdate={lastUpdate}>
              <Clock className="h-3.5 w-3.5 text-[hsl(45,95%,40%)] mb-1" />
              <div className="text-[11px] text-muted-foreground">A Receber</div>
              <div className={`text-sm font-bold leading-tight ${periodPending > 0 ? "text-[hsl(45,95%,40%)]" : "text-success"}`}>
                {fmt(periodPending)}
              </div>
            </HighlightCard>

            {/* KPIs secundários */}
            <HighlightCard lastUpdate={lastUpdate}>
              <TrendingDown className="h-3.5 w-3.5 text-secondary mb-1" />
              <div className="text-[11px] text-muted-foreground">Custos</div>
              <div className="text-sm font-bold text-secondary leading-tight">{fmt(totalCosts)}</div>
            </HighlightCard>
            <HighlightCard lastUpdate={lastUpdate}>
              <Percent className="h-3.5 w-3.5 text-primary mb-1" />
              <div className="text-[11px] text-muted-foreground">Margem Média</div>
              <div className="text-sm font-bold text-primary leading-tight">{avgMargin.toFixed(1)}%</div>
            </HighlightCard>
            <HighlightCard lastUpdate={lastUpdate} className="col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] text-muted-foreground">Taxa de Conversão</span>
                  </div>
                  <div className="text-xl font-bold text-primary leading-tight">{conversionRate.toFixed(1)}%</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {filteredQuotes.filter(q => (q.status || 'orcado') === 'aprovado').length} aprovado(s) / {filteredQuotes.length} orçamento(s)
                  </div>
                </div>
                <div className="w-16 h-16 relative flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke="hsl(var(--primary))" strokeWidth="3"
                      strokeDasharray={`${conversionRate} ${100 - conversionRate}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-primary">{conversionRate.toFixed(0)}%</span>
                </div>
              </div>
            </HighlightCard>
          </div>
        </div>

        {/* ── Obras em Andamento — sempre visíveis, independente do período ── */}
        <div>
          {/* Cabeçalho: título + contador + toggle view + minimizar */}
          <div className="flex items-center gap-2 mb-3">
            <button
              className="flex items-center gap-2 min-w-0 flex-1 text-left"
              onClick={() => {
                const next = !andamentoOpen;
                setAndamentoOpen(next);
                localStorage.setItem("dashAndamentoOpen", String(next));
              }}
            >
              <Briefcase className="h-4 w-4 text-primary shrink-0" />
              <h2 className="text-lg font-bold text-foreground leading-tight">Obras em Andamento</h2>
              <span className="text-sm text-muted-foreground shrink-0">({jobsEmAberto.length})</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 shrink-0 ${andamentoOpen ? 'rotate-180' : ''}`} />
            </button>
            {andamentoOpen && (
              <ViewToggle
                view={andamentoView}
                onChange={(v) => { setAndamentoView(v); localStorage.setItem("dashAndamentoView", v); }}
              />
            )}
            <Link to="/app/nova-obra" className="shrink-0">
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova</Button>
            </Link>
          </div>

          <AnimatePresence>
            {andamentoOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                {jobsEmAberto.length === 0 ? (
                  <div className="bg-card rounded-xl p-6 text-center shadow-card">
                    <Briefcase className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma obra em andamento</p>
                  </div>
                ) : andamentoView === "kanban" ? (
                  /* ── Kanban: colunas Em Andamento | Aguard. Pagamento ── */
                  <div className="overflow-x-auto pb-4 -mx-4 px-4">
                    <div className="flex gap-3" style={{ minWidth: "max-content" }}>
                      {OPEN_JOB_STATUSES.map(status => {
                        const colJobs = jobsEmAberto.filter(j => (j.status as JobStatus) === status);
                        const colTotal = colJobs.reduce((s, j) => s + j.saleValue, 0);
                        return (
                          <div key={status} className="flex flex-col w-[220px] flex-shrink-0">
                            <div className="flex items-center gap-1.5 mb-2 px-1">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: JOB_STATUS_HEX[status] }} />
                              <p className="text-xs font-bold text-foreground leading-tight flex-1 min-w-0 truncate">
                                {JOB_STATUS_LABELS[status]} ({colJobs.length}){colJobs.length > 0 ? ` — ${fmt(colTotal)}` : ""}
                              </p>
                            </div>
                            <div className="rounded-xl p-2 space-y-2 min-h-[100px] bg-muted/40">
                              {colJobs.map(job => {
                                const expenses = job.expenses.reduce((s, e) => s + e.value, 0);
                                const profit = job.saleValue - expenses;
                                const received = job.totalReceived ?? 0;
                                const pending = Math.max(0, job.saleValue - received);
                                return (
                                  <Link key={job.id} to={`/app/obra/${job.id}`}>
                                    <div className="bg-card rounded-xl border border-border/50 shadow-card hover:shadow-elevated transition-shadow p-3 mb-2">
                                      <h3 className="font-bold text-foreground text-sm leading-tight truncate">{job.clientName}</h3>
                                      {job.description && <p className="text-[11px] text-muted-foreground truncate mb-1">{job.description}</p>}
                                      <JobStepDots status={job.status} etapaMedicao={job.etapaMedicao} etapaPedirVidro={job.etapaPedirVidro} etapaFabricacao={job.etapaFabricacao} etapaInstalacao={job.etapaInstalacao} />
                                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1.5 text-[9px]">
                                        <div><span className="text-muted-foreground">Recebido</span><div className="font-bold text-success">{fmt(received)}</div></div>
                                        <div><span className="text-muted-foreground">A Receber</span><div className={`font-bold ${pending > 0 ? "text-[hsl(45,95%,40%)]" : "text-success"}`}>{fmt(pending)}</div></div>
                                        <div><span className="text-muted-foreground">Total</span><div className="font-bold text-foreground">{fmt(job.saleValue)}</div></div>
                                        <div><span className="text-muted-foreground">Lucro</span><div className={`font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>{fmt(profit)}</div></div>
                                      </div>
                                    </div>
                                  </Link>
                                );
                              })}
                              {colJobs.length === 0 && (
                                <div className="flex items-center justify-center h-16 text-[11px] text-muted-foreground/40">Sem obras</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* ── Lista: Em Andamento primeiro, depois Aguard. Pagamento ── */
                  <div className="space-y-4">
                    {OPEN_JOB_STATUSES.map(status => {
                      const group = jobsEmAberto.filter(j => (j.status as JobStatus) === status);
                      if (group.length === 0) return null;
                      return (
                        <div key={status}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: JOB_STATUS_HEX[status] }} />
                            <span className="text-sm font-bold text-foreground">{JOB_STATUS_LABELS[status]}</span>
                            <span className="text-xs text-muted-foreground">({group.length})</span>
                          </div>
                          <div className="space-y-2">
                            {group.map(job => {
                              const expenses = job.expenses.reduce((s, e) => s + e.value, 0);
                              const profit = job.saleValue - expenses;
                              const received = job.totalReceived ?? 0;
                              const pending = Math.max(0, job.saleValue - received);
                              return (
                                <Link key={job.id} to={`/app/obra/${job.id}`}>
                                  <div className="bg-card rounded-xl p-3 shadow-card hover:shadow-elevated transition-shadow border-l-4 border-l-primary/40">
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                      <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-foreground text-sm leading-tight truncate">{job.clientName}</h3>
                                        {job.description && <p className="text-[11px] text-muted-foreground truncate">{job.description}</p>}
                                      </div>
                                      <span className="text-sm font-bold text-foreground shrink-0">{fmt(job.saleValue)}</span>
                                    </div>
                                    <JobStepDots status={job.status} etapaMedicao={job.etapaMedicao} etapaPedirVidro={job.etapaPedirVidro} etapaFabricacao={job.etapaFabricacao} etapaInstalacao={job.etapaInstalacao} />
                                    <div className="grid grid-cols-3 gap-x-3 mt-2 text-[10px]">
                                      <div><span className="text-muted-foreground">Recebido</span><div className="font-bold text-success">{fmt(received)}</div></div>
                                      <div><span className="text-muted-foreground">A Receber</span><div className={`font-bold ${pending > 0 ? "text-[hsl(45,95%,40%)]" : "text-success"}`}>{fmt(pending)}</div></div>
                                      <div><span className="text-muted-foreground">Lucro</span><div className={`font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>{fmt(profit)}</div></div>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Ver por Mês — histórico filtrado pelo período ── */}
        {(jobs.length > 0 || quotes.length > 0) && (
          <div>
            <Button
              variant="outline"
              className="w-full gap-2 justify-center"
              onClick={() => setMonthlyOpen(!monthlyOpen)}
            >
              <CalendarDays className="h-4 w-4" />
              📅 Ver por Mês
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${monthlyOpen ? 'rotate-180' : ''}`} />
            </Button>

            <AnimatePresence>
              {monthlyOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-4">
                    {visibleMonthlyData.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum dado no período selecionado.
                      </p>
                    )}
                    {visibleMonthlyData.length > 1 && (
                      <div className="bg-card rounded-xl p-4 shadow-card">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Evolução do Lucro</h3>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[...visibleMonthlyData].reverse()}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="month" tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.split(' ')[0].slice(0, 3)} />
                              <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                              <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(l: string) => l} />
                              <Bar dataKey="profit" name="Lucro" radius={[4, 4, 0, 0]}>
                                {[...visibleMonthlyData].reverse().map((entry, i) => (
                                  <Cell key={i} fill={entry.profit >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      {visibleMonthlyData.map((m, i) => {
                        const indicator = m.profit < 0
                          ? 'border-l-destructive bg-destructive/5'
                          : m.margin < 20
                            ? 'border-l-[hsl(45,95%,50%)] bg-[hsl(45,95%,50%)]/5'
                            : 'border-l-success bg-success/5';
                        return (
                          <motion.div
                            key={m.key}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`bg-card rounded-xl p-4 shadow-card border-l-4 ${indicator}`}
                          >
                            <button
                              type="button"
                              className="flex items-center justify-between mb-3 w-full text-left"
                              onClick={() => setExpandedMonth(expandedMonth === m.key ? null : m.key)}
                            >
                              <h4 className="font-bold text-foreground">{m.month}</h4>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{m.count} obra{m.count !== 1 ? 's' : ''}</span>
                                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${expandedMonth === m.key ? 'rotate-180' : ''}`} />
                              </div>
                            </button>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Vendas</span>
                                <div className="font-bold text-foreground">{fmt(m.sales)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Custos</span>
                                <div className="font-bold text-secondary">{fmt(m.costs)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Lucro</span>
                                <div className={`font-bold ${m.profit >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(m.profit)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Margem</span>
                                <div className={`font-bold ${m.profit < 0 ? 'text-destructive' : m.margin < 20 ? 'text-[hsl(45,95%,50%)]' : 'text-success'}`}>{m.margin.toFixed(1)}%</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Recebido</span>
                                <div className="font-bold text-success">{fmt(m.received)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">A Receber</span>
                                <div className={`font-bold ${m.pending > 0 ? 'text-[hsl(45,95%,40%)]' : 'text-success'}`}>{fmt(m.pending)}</div>
                              </div>
                            </div>

                            {/* Accordion de orçamentos e obras do mês */}
                            <AnimatePresence>
                              {expandedMonth === m.key && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-3 pt-3 border-t border-border/50 space-y-4">
                                    {/* ── Orçamentos do mês ── */}
                                    {m.monthQuotes.length > 0 && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <FileText className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Orçamentos</span>
                                          <span className="text-[10px] text-muted-foreground">({m.monthQuotes.length})</span>
                                        </div>
                                        <div className="space-y-2 pl-1">
                                          {(['orcado', 'enviado', 'perdido'] as QuoteStatus[]).map(st => {
                                            const group = m.monthQuotes.filter(q => (q.status || 'orcado') === st);
                                            if (group.length === 0) return null;
                                            return (
                                              <div key={st}>
                                                <div className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                                                  <span className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: QUOTE_STATUS_COLORS[st] }} />
                                                  {QUOTE_STATUS_LABELS[st]} ({group.length})
                                                </div>
                                                {group.map(q => (
                                                  <Link key={q.id} to={`/app/orcamento/${q.id}`}>
                                                    <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60 active:bg-muted transition-colors">
                                                      <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-foreground truncate">{q.clientName}</div>
                                                        {q.jobType && <div className="text-xs text-muted-foreground truncate">{q.jobType}</div>}
                                                      </div>
                                                      <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-sm font-bold text-foreground">{fmt(q.total)}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${QUOTE_STATUS_BG[st]}`}>
                                                          {QUOTE_STATUS_LABELS[st]}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </Link>
                                                ))}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* ── Obras do mês ── */}
                                    {m.monthJobs.length > 0 && (
                                      <div className={m.monthQuotes.length > 0 ? "pt-3 border-t border-border/40" : ""}>
                                        <div className="flex items-center gap-2 mb-2">
                                          <Briefcase className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Obras</span>
                                          <span className="text-[10px] text-muted-foreground">({m.monthJobs.length})</span>
                                        </div>
                                        <div className="space-y-2 pl-1">
                                          {(ALL_JOB_STATUSES).map(st => {
                                            const group = m.monthJobs.filter(j => ((j.status as JobStatus) || 'em_andamento') === st);
                                            if (group.length === 0) return null;
                                            return (
                                              <div key={st}>
                                                <div className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: JOB_STATUS_HEX[st] }} />
                                                  {JOB_STATUS_LABELS[st]} ({group.length})
                                                </div>
                                                {group.map(job => (
                                                  <Link key={job.id} to={`/app/obra/${job.id}`}>
                                                    <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60 active:bg-muted transition-colors">
                                                      <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-foreground truncate">{job.clientName}</div>
                                                        {job.description && <div className="text-xs text-muted-foreground truncate">{job.description}</div>}
                                                      </div>
                                                      <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-sm font-bold text-foreground">{fmt(job.saleValue)}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${JOB_STATUS_COLORS[st]}`}>
                                                          {JOB_STATUS_LABELS[st]}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </Link>
                                                ))}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {m.monthQuotes.length === 0 && m.monthJobs.length === 0 && (
                                      <p className="text-xs text-muted-foreground text-center py-2">Nenhum registro neste mês</p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Gráficos de pizza — orçamentos do período ── */}
        {hasQuotes && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-foreground">Orçamentos — Visão Geral</h2>
              <button
                onClick={togglePieChart}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted shrink-0"
              >
                <PieChartIcon className="h-3.5 w-3.5" />
                {showPieChart ? "Ocultar" : "Mostrar gráfico"}
              </button>
            </div>
            <AnimatePresence>
              {showPieChart && (
                <motion.div
                  key="pie-chart"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="bg-card rounded-xl shadow-card p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground text-center mb-1 uppercase tracking-wide">Quantidade</h4>
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={qtyData} cx="50%" cy="50%" outerRadius={45} dataKey="value" label={renderLabel} labelLine={false} stroke="none">
                                {qtyData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                              </Pie>
                              <Tooltip formatter={(v: number) => `${v} orçamento(s)`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 mt-1">
                          {quotesByStatus.map((d) => (
                            <div key={d.status} className="flex items-center gap-1 text-[10px]">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                              <span className="text-muted-foreground">{d.label} ({d.count})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground text-center mb-1 uppercase tracking-wide">Valores (R$)</h4>
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={valueData} cx="50%" cy="50%" outerRadius={45} dataKey="value" label={renderLabel} labelLine={false} stroke="none">
                                {valueData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                              </Pie>
                              <Tooltip formatter={(v: number) => fmt(v)} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 mt-1">
                          {quotesByStatus.map((d) => (
                            <div key={d.status} className="flex items-center gap-1 text-[10px]">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                              <span className="text-muted-foreground">{d.label} ({fmt(d.total)})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Orçamentos do período ── */}
        <div>
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground leading-tight">Orçamentos</h2>
              <p className="text-[11px] text-muted-foreground">{PERIOD_LABELS[period]} · {filteredQuotes.length} registro(s)</p>
            </div>
            <Link to="/app/novo-orcamento" className="shrink-0">
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo</Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle
              view={quotesView}
              onChange={(v) => { setQuotesView(v); localStorage.setItem("dashQuotesView", v); }}
            />
            <Button size="sm" variant="outline" onClick={() => setQuotesOpen(!quotesOpen)} className="gap-1 flex-1 min-w-0">
              Ver todos
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 shrink-0 ${quotesOpen ? "rotate-180" : ""}`} />
            </Button>
          </div>

          <AnimatePresence>
            {quotesOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-4">
                  {filteredQuotes.length === 0 ? (
                    <div className="text-center py-10">
                      <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhum orçamento no período.</p>
                    </div>
                  ) : quotesView === "kanban" ? (
                    <QuoteKanban quotes={filteredQuotes} />
                  ) : (
                    <div className="space-y-4">
                      {quotesByStatus.filter(g => g.count > 0).map((group) => (
                        <div key={group.status}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                            <span className="text-sm font-bold text-foreground">{group.label} ({group.count})</span>
                            <span className="text-xs text-muted-foreground">— {fmt(group.total)}</span>
                          </div>
                          <div className="space-y-2">
                            {group.quotes.map((quote, i) => (
                              <motion.div key={quote.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                                <Link to={`/app/orcamento/${quote.id}`}>
                                  <div className="bg-card rounded-xl shadow-card hover:shadow-elevated transition-shadow p-4">
                                    <div className="flex items-center justify-between mb-1">
                                      <h3 className="font-bold text-foreground truncate">{quote.clientName}</h3>
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ml-2 ${QUOTE_STATUS_BG[group.status]}`}>{group.label}</span>
                                    </div>
                                    {quote.jobType && <p className="text-sm text-muted-foreground truncate mb-1">{quote.jobType}</p>}
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(quote.createdAt).toLocaleDateString("pt-BR")} · {quote.items.length} {quote.items.length === 1 ? "item" : "itens"}
                                      </span>
                                      <span className="font-bold text-primary text-sm">{fmt(quote.total)}</span>
                                    </div>
                                  </div>
                                </Link>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Obras do período (histórico filtrado) ── */}
        <div>
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground leading-tight">Obras</h2>
              <p className="text-[11px] text-muted-foreground">{PERIOD_LABELS[period]} · {filteredJobs.length} registro(s)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle
              view={jobsView}
              onChange={(v) => { setJobsView(v); localStorage.setItem("dashJobsView", v); }}
            />
            <Button size="sm" variant="outline" onClick={() => setJobsOpen(!jobsOpen)} className="gap-1 flex-1 min-w-0">
              Ver todas
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 shrink-0 ${jobsOpen ? "rotate-180" : ""}`} />
            </Button>
          </div>

          <AnimatePresence>
            {jobsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-4">
                  {filteredJobs.length === 0 ? (
                    <div className="text-center py-10">
                      <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhuma obra no período.</p>
                    </div>
                  ) : jobsView === "kanban" ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-3">Obras agrupadas por status.</p>
                      <div className="overflow-x-auto pb-4 -mx-4 px-4">
                        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
                          {ALL_JOB_STATUSES.map((status) => {
                            const colJobs = filteredJobs.filter(j => (j.status as JobStatus || 'em_andamento') === status);
                            const colTotal = colJobs.reduce((s, j) => s + j.saleValue, 0);
                            return (
                              <div key={status} className="flex flex-col w-[220px] flex-shrink-0">
                                <div className="flex items-center gap-1.5 mb-2 px-1">
                                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: JOB_STATUS_HEX[status] }} />
                                  <p className="text-xs font-bold text-foreground leading-tight flex-1 min-w-0 truncate">
                                    {JOB_STATUS_LABELS[status]} ({colJobs.length}){colJobs.length > 0 ? ` — ${fmt(colTotal)}` : ""}
                                  </p>
                                </div>
                                <div className="rounded-xl p-2 space-y-2 min-h-[140px] bg-muted/40">
                                  {colJobs.map((job) => {
                                    const expenses = job.expenses.reduce((s, e) => s + e.value, 0);
                                    const profit = job.saleValue - expenses;
                                    const received = job.totalReceived ?? 0;
                                    const pending = Math.max(0, job.saleValue - received);
                                    return (
                                      <Link key={job.id} to={`/app/obra/${job.id}`}>
                                        <div className="bg-card rounded-xl border border-border/50 shadow-card hover:shadow-elevated transition-shadow p-3 mb-2">
                                          <h3 className="font-bold text-foreground text-sm leading-tight truncate">{job.clientName}</h3>
                                          {job.description && <p className="text-[11px] text-muted-foreground truncate mb-1">{job.description}</p>}
                                          <JobStepDots status={job.status} etapaMedicao={job.etapaMedicao} etapaPedirVidro={job.etapaPedirVidro} etapaFabricacao={job.etapaFabricacao} etapaInstalacao={job.etapaInstalacao} />
                                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1.5">
                                            <div>
                                              <div className="text-[9px] text-muted-foreground leading-tight">Total</div>
                                              <div className="text-[11px] font-bold text-foreground leading-tight">{fmt(job.saleValue)}</div>
                                            </div>
                                            <div>
                                              <div className="text-[9px] text-muted-foreground leading-tight">Recebido</div>
                                              <div className="text-[11px] font-bold text-success leading-tight">{fmt(received)}</div>
                                            </div>
                                            <div>
                                              <div className="text-[9px] text-muted-foreground leading-tight">A Receber</div>
                                              <div className={`text-[11px] font-bold leading-tight ${pending > 0 ? "text-[hsl(45,95%,40%)]" : "text-success"}`}>{fmt(pending)}</div>
                                            </div>
                                            <div>
                                              <div className="text-[9px] text-muted-foreground leading-tight">Lucro</div>
                                              <div className={`text-[11px] font-bold leading-tight ${profit >= 0 ? "text-success" : "text-destructive"}`}>{fmt(profit)}</div>
                                            </div>
                                          </div>
                                        </div>
                                      </Link>
                                    );
                                  })}
                                  {colJobs.length === 0 && (
                                    <div className="flex items-center justify-center h-20 text-[11px] text-muted-foreground/40 text-center">
                                      Sem obras
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {ALL_JOB_STATUSES.map(status => {
                        const groupJobs = filteredJobs
                          .filter(j => ((j.status as JobStatus) || 'em_andamento') === status)
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        if (groupJobs.length === 0) return null;
                        const groupTotal = groupJobs.reduce((s, j) => s + j.saleValue, 0);
                        return (
                          <div key={status}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: JOB_STATUS_HEX[status] }} />
                              <span className="text-sm font-bold text-foreground">{JOB_STATUS_LABELS[status]}</span>
                              <span className="text-xs text-muted-foreground">({groupJobs.length}) — {fmt(groupTotal)}</span>
                            </div>
                            <div className="space-y-2">
                              {groupJobs.map((job, i) => {
                                const expenses = job.expenses.reduce((s, e) => s + e.value, 0);
                                const profit = job.saleValue - expenses;
                                return (
                                  <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                                    <Link to={`/app/obra/${job.id}`}>
                                      <div className="bg-card rounded-xl p-4 shadow-card hover:shadow-elevated transition-shadow">
                                        <div className="flex items-center justify-between mb-2">
                                          <h3 className="font-bold text-foreground truncate">{job.clientName}</h3>
                                          <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ml-2 ${JOB_STATUS_COLORS[status]}`}>
                                            {JOB_STATUS_LABELS[status]}
                                          </span>
                                        </div>
                                        {job.description && <p className="text-sm text-muted-foreground truncate mb-1">{job.description}</p>}
                                        <JobStepDots status={job.status} etapaMedicao={job.etapaMedicao} etapaPedirVidro={job.etapaPedirVidro} etapaFabricacao={job.etapaFabricacao} etapaInstalacao={job.etapaInstalacao} />
                                        <div className="flex items-center gap-4 text-sm mt-2">
                                          <span className="text-muted-foreground">Venda: <strong className="text-foreground">{fmt(job.saleValue)}</strong></span>
                                          <span className="text-muted-foreground">Lucro: <strong className={profit >= 0 ? "text-success" : "text-destructive"}>{fmt(profit)}</strong></span>
                                        </div>
                                      </div>
                                    </Link>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reset button */}
        <div className="text-center pt-4 pb-8">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
            onClick={async () => {
              if (confirm("Apagar TODOS os orçamentos, obras e custos? Os dados da empresa serão mantidos.")) {
                await clearAllData();
                await refreshAll();
                toast.success("Dados limpos! Sistema zerado para novo teste.");
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Limpar dados de teste
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AppDashboard;
