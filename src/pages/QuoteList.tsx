import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, FileText, LayoutGrid, List, CheckCircle2, XCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app/AppHeader";
import { useData } from "@/lib/DataContext";
import { QuoteStatus, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS, QUOTE_STATUS_BG } from "@/lib/types";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { QuoteKanban } from "@/components/app/QuoteKanban";
import { QuoteSendMenu } from "@/components/app/QuoteSendMenu";
import { PeriodFilter, usePeriodFilter } from "@/components/app/PeriodFilter";

const ALL_STATUSES: QuoteStatus[] = ["orcado", "enviado", "aguardando", "aprovado", "entregue", "perdido"];
const CHART_STATUSES: QuoteStatus[] = ["orcado", "aguardando", "aprovado", "perdido"];

const QuoteList = () => {
  const { quotes, changeQuoteStatus, refreshQuotes } = useData();

  useEffect(() => {
    refreshQuotes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [searchParams] = useSearchParams();
  const novoId = searchParams.get("novo");

  const [view, setView] = useState<"kanban" | "list">(
    () => (localStorage.getItem("quoteView") as "kanban" | "list") || "kanban",
  );

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const setViewAndStore = (v: "kanban" | "list") => {
    setView(v);
    localStorage.setItem("quoteView", v);
  };

  const handleStatusChange = async (id: string, newStatus: QuoteStatus) => {
    await changeQuoteStatus(id, newStatus);
  };

  // ── Filtro de período (independente do Dashboard) ────────────
  const periodFilter = usePeriodFilter("quoteList");

  const availableMonths = useMemo(() => {
    const keys = new Set<string>();
    quotes.forEach(q => {
      const d = new Date(q.createdAt);
      keys.add(`${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`);
    });
    return Array.from(keys).sort();
  }, [quotes]);

  const filteredQuotes = useMemo(() =>
    quotes.filter(q => {
      const d = new Date(q.createdAt);
      return d >= periodFilter.periodStart && d <= periodFilter.periodEnd;
    }),
    [quotes, periodFilter.periodStart, periodFilter.periodEnd],
  );

  // ── Dados para lista e gráficos ──────────────────────────────
  const quotesByStatus = ALL_STATUSES.map(status => {
    const filtered = filteredQuotes.filter(q => (q.status || "orcado") === status);
    return {
      status,
      label: QUOTE_STATUS_LABELS[status],
      color: QUOTE_STATUS_COLORS[status],
      count: filtered.length,
      total: filtered.reduce((s, q) => s + q.total, 0),
      quotes: filtered,
    };
  });

  const chartByStatus = quotesByStatus.filter(d => CHART_STATUSES.includes(d.status));
  const qtyData = chartByStatus.filter(d => d.count > 0).map(d => ({ name: d.label, value: d.count, color: d.color }));
  const valueData = chartByStatus.filter(d => d.total > 0).map(d => ({ name: d.label, value: d.total, color: d.color }));
  const renderLabel = ({ percent }: { percent: number }) =>
    percent > 0 ? `${(percent * 100).toFixed(0)}%` : "";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Orçamentos" backTo="/app" />

      <div className="container py-6 space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Meus Orçamentos</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewAndStore("kanban")}
                title="Kanban"
                className={`p-1.5 rounded-md transition-colors ${view === "kanban" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewAndStore("list")}
                title="Lista"
                className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Link to="/app/novo-orcamento">
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo</Button>
            </Link>
          </div>
        </div>

        {/* Filtro de período */}
        <PeriodFilter state={periodFilter} availableMonths={availableMonths} />

        {/* Contador */}
        <p className="text-[11px] text-muted-foreground">
          {periodFilter.periodLabel} · {filteredQuotes.length} registro(s)
        </p>

        {/* Gráficos — só na view lista */}
        {filteredQuotes.length > 0 && view === "list" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-4 shadow-card">
              <h3 className="text-xs font-bold text-muted-foreground text-center mb-2 uppercase tracking-wide">Quantidade</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={qtyData} cx="50%" cy="50%" outerRadius={68} dataKey="value" label={renderLabel} labelLine={false} stroke="none">
                      {qtyData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v} orçamento(s)`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {chartByStatus.map(d => (
                  <div key={d.status} className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.label} ({d.count})</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-card">
              <h3 className="text-xs font-bold text-muted-foreground text-center mb-2 uppercase tracking-wide">Valores (R$)</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={valueData} cx="50%" cy="50%" outerRadius={68} dataKey="value" label={renderLabel} labelLine={false} stroke="none">
                      {valueData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {chartByStatus.map(d => (
                  <div key={d.status} className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.label} ({fmt(d.total)})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredQuotes.length === 0 && (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum orçamento no período.</p>
          </div>
        )}

        {/* Kanban */}
        {filteredQuotes.length > 0 && view === "kanban" && (
          <QuoteKanban quotes={filteredQuotes} novoId={novoId} />
        )}

        {/* Lista */}
        {filteredQuotes.length > 0 && view === "list" && (
          <div className="space-y-5">
            {quotesByStatus.filter(g => g.count > 0).map(group => (
              <div key={group.status}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                  <span className="text-sm font-bold text-foreground">{group.label} ({group.count})</span>
                  <span className="text-xs text-muted-foreground">— {fmt(group.total)}</span>
                </div>
                <div className="space-y-2">
                  {group.quotes.map((q, i) => {
                    const qStatus = (q.status || "orcado") as QuoteStatus;
                    const qShowWA = qStatus === "orcado";
                    const qShowAprovar = qStatus === "enviado" || qStatus === "aguardando";
                    const qShowPerdido = qStatus === "enviado" || qStatus === "aguardando";
                    const isNovo = q.id === novoId;
                    return (
                      <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <div className={`bg-card rounded-xl shadow-card hover:shadow-elevated transition-shadow ${isNovo ? "ring-2 ring-primary/40 border border-primary/40" : ""}`}>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-1">
                              <Link to={`/app/orcamento/${q.id}`} className="font-bold text-foreground truncate hover:text-primary transition-colors">
                                {q.clientName}
                              </Link>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${QUOTE_STATUS_BG[group.status]}`}>
                                {group.label}
                              </span>
                            </div>
                            {q.jobType && <p className="text-sm text-muted-foreground mb-2">{q.jobType}</p>}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {q.quoteNumber && <span className="font-semibold text-primary/70 mr-1">#{q.quoteNumber} · </span>}
                                {new Date(q.createdAt).toLocaleDateString("pt-BR")} · {q.items.length} {q.items.length === 1 ? "item" : "itens"}
                              </span>
                              <span className="font-bold text-primary">{fmt(q.total)}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 px-4 pb-3 border-t border-border/50 pt-2 flex-wrap">
                            <Link to={`/app/orcamento/${q.id}`} className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                              <Eye className="h-3 w-3" /> Ver + Editar
                            </Link>
                            {qShowWA && <QuoteSendMenu quote={q} onStatusChange={handleStatusChange} size="md" />}
                            {qShowAprovar && (
                              <button
                                onClick={async e => { e.preventDefault(); await handleStatusChange(q.id, "aprovado"); toast.success("Obra criada com sucesso!"); }}
                                className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                              >
                                <CheckCircle2 className="h-3 w-3" /> Aprovar
                              </button>
                            )}
                            {qShowPerdido && (
                              <button
                                onClick={async e => { e.preventDefault(); await handleStatusChange(q.id, "perdido"); toast("Marcado como Perdido."); }}
                                className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                              >
                                <XCircle className="h-3 w-3" /> Perdido
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteList;
