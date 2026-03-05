import { Link } from "react-router-dom";
import { Plus, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app/AppHeader";
import { useData } from "@/lib/DataContext";
import { QuoteStatus, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS, QUOTE_STATUS_BG } from "@/lib/types";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";

const ALL_STATUSES: QuoteStatus[] = ['orcado', 'enviado', 'aguardando', 'aprovado', 'perdido'];

const QuoteList = () => {
  const { quotes, changeQuoteStatus } = useData();

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

  const hasData = quotes.length > 0;

  const renderLabel = ({ percent }: { percent: number }) =>
    percent > 0 ? `${(percent * 100).toFixed(0)}%` : "";

  const activeByStatus = ALL_STATUSES.map((status) => {
    const filtered = quotes.filter((q) => (q.status || "orcado") === status);
    return { status, label: QUOTE_STATUS_LABELS[status], color: QUOTE_STATUS_COLORS[status], count: filtered.length, total: filtered.reduce((s, q) => s + q.total, 0), quotes: filtered };
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Orçamentos" backTo="/app" />

      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Meus Orçamentos</h2>
          <Link to="/app/novo-orcamento">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Novo
            </Button>
          </Link>
        </div>

        {/* Charts */}
        {hasData && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-4 shadow-card">
              <h3 className="text-xs font-bold text-muted-foreground text-center mb-2 uppercase tracking-wide">Quantidade</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={qtyData} cx="50%" cy="50%" outerRadius={55} dataKey="value" label={renderLabel} labelLine={false} stroke="none">
                      {qtyData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v} orçamento(s)`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {quotesByStatus.map((d) => (
                  <div key={d.status} className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.label} ({d.count})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 shadow-card">
              <h3 className="text-xs font-bold text-muted-foreground text-center mb-2 uppercase tracking-wide">Valores (R$)</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={valueData} cx="50%" cy="50%" outerRadius={55} dataKey="value" label={renderLabel} labelLine={false} stroke="none">
                      {valueData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {quotesByStatus.map((d) => (
                  <div key={d.status} className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.label} ({fmt(d.total)})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quote list */}
        {quotes.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum orçamento ainda.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {activeByStatus.filter(g => g.count > 0).map((group) => (
              <div key={group.status}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                  <span className="text-sm font-bold text-foreground">{group.label} ({group.count})</span>
                  <span className="text-xs text-muted-foreground">— {fmt(group.total)}</span>
                </div>
                <div className="space-y-2">
                  {group.quotes.map((q, i) => {
                    const showActions = group.status === 'enviado' || group.status === 'aguardando';
                    return (
                      <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <div className="bg-card rounded-xl shadow-card hover:shadow-elevated transition-shadow">
                          <Link to={`/app/orcamento/${q.id}`}>
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-bold text-foreground truncate">{q.clientName}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${QUOTE_STATUS_BG[group.status]}`}>
                                  {group.label}
                                </span>
                              </div>
                              {q.jobType && <p className="text-sm text-muted-foreground mb-2">{q.jobType}</p>}
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(q.createdAt).toLocaleDateString("pt-BR")} · {q.items.length} {q.items.length === 1 ? "item" : "itens"}
                                </span>
                                <span className="font-bold text-primary">{fmt(q.total)}</span>
                              </div>
                            </div>
                          </Link>
                          {showActions && (
                            <div className="flex gap-2 px-4 pb-3 border-t border-border/50 pt-2">
                              {group.status === 'enviado' && (
                                <button
                                  onClick={async (e) => { e.preventDefault(); await changeQuoteStatus(q.id, 'aguardando'); toast.success('Status: Aguardando Aprovação'); }}
                                  className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-[hsl(25,90%,55%)]/10 text-[hsl(25,90%,45%)] hover:bg-[hsl(25,90%,55%)]/20 transition-colors"
                                >
                                  <Clock className="h-3 w-3" /> Aguardando
                                </button>
                              )}
                              <button
                                onClick={async (e) => { e.preventDefault(); await changeQuoteStatus(q.id, 'aprovado'); toast.success('Orçamento aprovado! Obra criada. 🎉'); }}
                                className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                              >
                                <CheckCircle2 className="h-3 w-3" /> Aprovar
                              </button>
                              <button
                                onClick={async (e) => { e.preventDefault(); await changeQuoteStatus(q.id, 'perdido'); toast('Marcado como Perdido.'); }}
                                className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                              >
                                <XCircle className="h-3 w-3" /> Perdido
                              </button>
                            </div>
                          )}
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
