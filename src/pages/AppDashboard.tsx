import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Briefcase, TrendingUp, TrendingDown, DollarSign, FileText, ChevronDown, Trash2, Percent, CalendarDays, Send, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app/AppHeader";
import { useData } from "@/lib/DataContext";
import { clearAllData } from "@/lib/storage";
import { QuoteStatus, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS, QUOTE_STATUS_BG, JOB_STATUS_LABELS, JOB_STATUS_COLORS, JobStatus } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { toast } from "sonner";

function triggerWhatsApp(quote: { clientPhone?: string; clientName: string; id: string }) {
  const phone = quote.clientPhone?.replace(/\D/g, '');
  if (!phone || phone.length !== 11) { toast.error("Telefone do cliente não cadastrado."); return; }
  const appUrl = `${window.location.origin}/orcamento-publico/${quote.id}`;
  const msg = `Olá ${quote.clientName}! Segue o orçamento: ${appUrl}\n\nQualquer dúvida estou à disposição!`;
  window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

const ALL_STATUSES: QuoteStatus[] = ['orcado', 'enviado', 'aguardando', 'aprovado', 'perdido'];
const ACTIVE_STATUSES: QuoteStatus[] = ['orcado', 'enviado', 'aguardando', 'perdido'];

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];


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
    <div className={`bg-card rounded-xl p-4 shadow-card transition-all duration-500 ${flash ? "ring-2 ring-success/50 shadow-[0_0_12px_hsl(var(--success)/0.3)]" : ""} ${className}`}>
      {children}
    </div>
  );
};

const AppDashboard = () => {
  const { jobs, quotes, refreshAll, lastUpdate, changeQuoteStatus } = useData();

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // Sales/Costs/Profit from jobs (expenses registered inside each job)
  const closedQuotes = quotes.filter(q => q.status === "aprovado");
  const totalSales = jobs.reduce((s, j) => s + j.saleValue, 0);
  const totalCosts = jobs.reduce((s, j) => s + j.expenses.reduce((es, e) => es + e.value, 0), 0);
  const totalProfit = totalSales - totalCosts;
  const avgMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100) : 0;

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Quote stats by status
  const quotesByStatus = ALL_STATUSES.map((status) => {
    const filtered = quotes.filter((q) => (q.status || "orcado") === status);
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

  // All quotes grouped by status for the Orçamentos accordion
  const activeByStatus = ALL_STATUSES.map((status) => {
    const filtered = quotes.filter((q) => (q.status || "orcado") === status);
    return {
      status,
      label: QUOTE_STATUS_LABELS[status],
      color: QUOTE_STATUS_COLORS[status],
      count: filtered.length,
      total: filtered.reduce((s, q) => s + q.total, 0),
      quotes: filtered,
    };
  });

  const hasQuotes = quotes.length > 0;
  const [quotesOpen, setQuotesOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);

  // Monthly breakdown from jobs (uses real expenses per job)
  const monthlyData = useMemo(() => {
    const map = new Map<string, { key: string; month: string; sales: number; costs: number; count: number }>();
    jobs.forEach(j => {
      const d = new Date(j.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      if (!map.has(key)) map.set(key, { key, month: label, sales: 0, costs: 0, count: 0 });
      const entry = map.get(key)!;
      entry.sales += j.saleValue;
      entry.costs += j.expenses.reduce((s, e) => s + e.value, 0);
      entry.count += 1;
    });
    return Array.from(map.values())
      .sort((a, b) => b.key.localeCompare(a.key))
      .map(e => ({ ...e, profit: e.sales - e.costs, margin: e.sales > 0 ? ((e.sales - e.costs) / e.sales) * 100 : 0 }));
  }, [jobs]);

  const renderLabel = ({ percent }: { percent: number }) =>
    percent > 0 ? `${(percent * 100).toFixed(0)}%` : "";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container py-6 space-y-6">
        {/* Summary cards — synced with Centro de Custo */}
        <div className="grid grid-cols-2 gap-3">
          <HighlightCard lastUpdate={lastUpdate}>
            <DollarSign className="h-4 w-4 text-muted-foreground mb-1" />
            <div className="text-xs text-muted-foreground">Vendas</div>
            <div className="text-sm font-bold text-foreground truncate">{fmt(totalSales)}</div>
          </HighlightCard>
          <HighlightCard lastUpdate={lastUpdate}>
            <TrendingDown className="h-4 w-4 text-secondary mb-1" />
            <div className="text-xs text-muted-foreground">Custos</div>
            <div className="text-sm font-bold text-secondary truncate">{fmt(totalCosts)}</div>
          </HighlightCard>
          <HighlightCard lastUpdate={lastUpdate}>
            <TrendingUp className="h-4 w-4 text-success mb-1" />
            <div className="text-xs text-muted-foreground">Lucro</div>
            <div className={`text-sm font-bold truncate ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}>
              {fmt(totalProfit)}
            </div>
          </HighlightCard>
          <HighlightCard lastUpdate={lastUpdate}>
            <Percent className="h-4 w-4 text-primary mb-1" />
            <div className="text-xs text-muted-foreground">Margem Média</div>
            <div className="text-sm font-bold text-primary truncate">{avgMargin.toFixed(1)}%</div>
          </HighlightCard>
        </div>

        {/* Monthly Breakdown Accordion */}
        {jobs.length > 0 && (
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
                    {/* Evolution chart */}
                    {monthlyData.length > 1 && (
                      <div className="bg-card rounded-xl p-4 shadow-card">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Evolução do Lucro</h3>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[...monthlyData].reverse()}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="month" tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.split(' ')[0].slice(0, 3)} />
                              <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                              <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(l: string) => l} />
                              <Bar dataKey="profit" name="Lucro" radius={[4, 4, 0, 0]}>
                                {[...monthlyData].reverse().map((entry, i) => (
                                  <Cell key={i} fill={entry.profit >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Monthly cards */}
                    <div className="space-y-3">
                      {monthlyData.map((m, i) => {
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
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-bold text-foreground">{m.month}</h4>
                              <span className="text-xs text-muted-foreground">{m.count} obra{m.count !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-xs">
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
                            </div>
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

        {/* Gráficos de pizza */}
        {hasQuotes && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-3">Orçamentos — Visão Geral</h2>
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
          </div>
        )}

        {/* Seção Orçamentos */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Orçamentos</h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setQuotesOpen(!quotesOpen)} className="gap-1">
                Ver todos
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${quotesOpen ? "rotate-180" : ""}`} />
              </Button>
              <Link to="/app/novo-orcamento">
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Orçamento</Button>
              </Link>
            </div>
          </div>
          <div className="overflow-hidden transition-all duration-300 ease-out" style={{ maxHeight: quotesOpen ? `${quotes.length * 120 + activeByStatus.length * 60 + 200}px` : "0px", opacity: quotesOpen ? 1 : 0 }}>
            <div className="pt-3 space-y-4">
              {quotes.length === 0 ? (
                <div className="text-center py-10">
                  <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum orçamento ainda.</p>
                </div>
              ) : (
                activeByStatus.filter(g => g.count > 0).map((group) => (
                  <div key={group.status}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                      <span className="text-sm font-bold text-foreground">{group.label} ({group.count})</span>
                      <span className="text-xs text-muted-foreground">— {fmt(group.total)}</span>
                    </div>
                    <div className="space-y-2">
                      {group.quotes.map((quote, i) => {
                        const showWA = group.status === 'orcado';
                        const showAprovar = group.status === 'enviado' || group.status === 'aguardando';
                        const showPerdido = group.status === 'enviado' || group.status === 'aguardando';
                        return (
                          <motion.div key={quote.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                            <div className="bg-card rounded-xl shadow-card hover:shadow-elevated transition-shadow">
                              <Link to={`/app/orcamento/${quote.id}`} className="block p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-bold text-foreground truncate">{quote.clientName}</h3>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${QUOTE_STATUS_BG[group.status]}`}>{group.label}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-muted-foreground">Total: <strong className="text-foreground">{fmt(quote.total)}</strong></span>
                                </div>
                              </Link>
                              {(showWA || showAprovar || showPerdido) && (
                                <div className="flex gap-2 px-4 pb-3 border-t border-border/50 pt-2 flex-wrap">
                                  {showWA && (
                                    <button onClick={async (e) => { e.preventDefault(); await changeQuoteStatus(quote.id, 'enviado'); triggerWhatsApp(quote); toast.success("Enviado! WhatsApp aberto."); }}
                                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-[hsl(215,80%,55%)]/10 text-[hsl(215,80%,45%)] hover:bg-[hsl(215,80%,55%)]/20 transition-colors">
                                      <Send className="h-3 w-3" /> Enviar WA
                                    </button>
                                  )}
                                  {showAprovar && (
                                    <button onClick={async (e) => { e.preventDefault(); await changeQuoteStatus(quote.id, 'aprovado'); toast.success("Aprovado! Obra criada. 🎉"); }}
                                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors">
                                      <CheckCircle2 className="h-3 w-3" /> Aprovar
                                    </button>
                                  )}
                                  {showPerdido && (
                                    <button onClick={async (e) => { e.preventDefault(); await changeQuoteStatus(quote.id, 'perdido'); toast("Marcado como Perdido."); }}
                                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                                      <XCircle className="h-3 w-3" /> Perdido
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Minhas Obras */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Minhas Obras</h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setJobsOpen(!jobsOpen)} className="gap-1">
                Ver todos
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${jobsOpen ? "rotate-180" : ""}`} />
              </Button>
              <Link to="/app/nova-obra">
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Obra</Button>
              </Link>
            </div>
          </div>
          <div className="overflow-hidden transition-all duration-300 ease-out" style={{ maxHeight: jobsOpen ? `${jobs.length * 140 + 100}px` : "0px", opacity: jobsOpen ? 1 : 0 }}>
            <div className="pt-3 space-y-3">
              {jobs.length === 0 ? (
                <div className="text-center py-10">
                  <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma obra ainda.</p>
                  <p className="text-muted-foreground text-sm">Clique em "Nova Obra" para começar!</p>
                </div>
              ) : (
                jobs.map((job, i) => {
                  const expenses = job.expenses.reduce((s, e) => s + e.value, 0);
                  const profit = job.saleValue - expenses;
                  return (
                    <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Link to={`/app/obra/${job.id}`}>
                        <div className="bg-card rounded-xl p-4 shadow-card hover:shadow-elevated transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-foreground truncate">{job.clientName}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${JOB_STATUS_COLORS[(job.status as JobStatus) || 'em_andamento']}`}>
                              {JOB_STATUS_LABELS[(job.status as JobStatus) || 'em_andamento']}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mb-3">{job.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">Venda: <strong className="text-foreground">{fmt(job.saleValue)}</strong></span>
                            <span className="text-muted-foreground">Lucro: <strong className={profit >= 0 ? "text-success" : "text-destructive"}>{fmt(profit)}</strong></span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
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
