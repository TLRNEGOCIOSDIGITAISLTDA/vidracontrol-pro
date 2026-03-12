import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, FileText, LayoutGrid, List, CheckCircle2, XCircle, Send, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app/AppHeader";
import { useData } from "@/lib/DataContext";
import { Quote, QuoteStatus, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS, QUOTE_STATUS_BG } from "@/lib/types";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

const ALL_STATUSES: QuoteStatus[] = ["orcado", "enviado", "aguardando", "aprovado", "perdido"];

function triggerWhatsApp(quote: Quote) {
  const phone = quote.clientPhone?.replace(/\D/g, "");
  if (!phone || phone.length !== 11) {
    toast.error("Telefone do cliente não cadastrado.");
    return;
  }
  const appUrl = `${window.location.origin}/orcamento-publico/${quote.id}`;
  const msg = `Olá ${quote.clientName}! Segue o orçamento conforme solicitado: ${appUrl}\n\nQualquer dúvida estou à disposição!`;
  window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
}

// ===== KANBAN CARD =====
function KanbanCard({
  quote,
  onStatusChange,
  isNew,
}: {
  quote: Quote;
  onStatusChange: (id: string, status: QuoteStatus) => Promise<void>;
  isNew?: boolean;
}) {
  const status = (quote.status || "orcado") as QuoteStatus;
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: quote.id,
    data: { status },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 }
    : undefined;

  const showWA = status === "orcado" || status === "enviado";
  const showAprovar = status !== "aprovado" && status !== "perdido";
  const showPerdido = status !== "aprovado" && status !== "perdido";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card rounded-xl border select-none transition-shadow ${
        isDragging ? "opacity-40 shadow-sm" : "shadow-card"
      } ${isNew ? "border-primary/60 ring-2 ring-primary/30" : "border-border/50"}`}
    >
      {/* Card body — draggable */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-3"
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-foreground text-sm leading-tight">{quote.clientName}</h3>
          <span className="font-bold text-primary text-sm whitespace-nowrap">{fmt(quote.total)}</span>
        </div>
        {quote.jobType && (
          <p className="text-xs text-muted-foreground mb-1 truncate">{quote.jobType}</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          {new Date(quote.createdAt).toLocaleDateString("pt-BR")} ·{" "}
          {quote.items.length} {quote.items.length === 1 ? "item" : "itens"}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex gap-1 px-2 pb-2.5 flex-wrap border-t border-border/40 pt-1.5">
        <Link
          to={`/app/orcamento/${quote.id}`}
          className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          onClick={(e) => isDragging && e.preventDefault()}
        >
          <Eye className="h-2.5 w-2.5" /> Ver
        </Link>
        {showWA && (
          <button
            onClick={async (e) => {
              e.preventDefault();
              await onStatusChange(quote.id, "enviado");
              triggerWhatsApp(quote);
              toast.success("Enviado! WhatsApp aberto.");
            }}
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-[hsl(215,80%,55%)]/10 text-[hsl(215,80%,45%)] hover:bg-[hsl(215,80%,55%)]/20 transition-colors"
          >
            <Send className="h-2.5 w-2.5" /> Enviar WA
          </button>
        )}
        {showAprovar && (
          <button
            onClick={async (e) => {
              e.preventDefault();
              await onStatusChange(quote.id, "aprovado");
              toast.success("Aprovado! Obra criada. 🎉");
            }}
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors"
          >
            <CheckCircle2 className="h-2.5 w-2.5" /> Aprovar
          </button>
        )}
        {showPerdido && (
          <button
            onClick={async (e) => {
              e.preventDefault();
              await onStatusChange(quote.id, "perdido");
              toast("Marcado como Perdido.");
            }}
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <XCircle className="h-2.5 w-2.5" /> Perdido
          </button>
        )}
      </div>
    </div>
  );
}

// ===== KANBAN COLUMN =====
function KanbanColumn({
  status,
  label,
  color,
  quotes,
  onStatusChange,
  novoId,
}: {
  status: QuoteStatus;
  label: string;
  color: string;
  quotes: Quote[];
  onStatusChange: (id: string, status: QuoteStatus) => Promise<void>;
  novoId?: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const total = quotes.reduce((s, q) => s + q.total, 0);

  return (
    <div className="flex flex-col w-[220px] flex-shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-bold text-foreground leading-tight flex-1">{label}</span>
        <span className="bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {quotes.length}
        </span>
      </div>
      {quotes.length > 0 && (
        <p className="text-[10px] text-muted-foreground px-1 mb-2">{fmt(total)}</p>
      )}

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 space-y-2 min-h-[140px] transition-all duration-150 ${
          isOver
            ? "bg-primary/8 ring-2 ring-primary/40 ring-inset"
            : "bg-muted/40"
        }`}
      >
        {quotes.map((q) => (
          <KanbanCard key={q.id} quote={q} onStatusChange={onStatusChange} isNew={q.id === novoId} />
        ))}
        {quotes.length === 0 && (
          <div className="flex items-center justify-center h-20 text-[11px] text-muted-foreground/40 text-center pointer-events-none">
            Solte aqui
          </div>
        )}
      </div>
    </div>
  );
}

// ===== MAIN =====
const QuoteList = () => {
  const { quotes, changeQuoteStatus } = useData();
  const [searchParams] = useSearchParams();
  const novoId = searchParams.get("novo");
  const [view, setView] = useState<"kanban" | "list">(
    () => (localStorage.getItem("quoteView") as "kanban" | "list") || "kanban"
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const setViewAndStore = (v: "kanban" | "list") => {
    setView(v);
    localStorage.setItem("quoteView", v);
  };

  const handleStatusChange = async (id: string, newStatus: QuoteStatus) => {
    await changeQuoteStatus(id, newStatus);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const quoteId = active.id as string;
    const newStatus = over.id as QuoteStatus;
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) return;

    const currentStatus = (quote.status || "orcado") as QuoteStatus;
    if (currentStatus === newStatus) return;

    await changeQuoteStatus(quoteId, newStatus);

    if (newStatus === "enviado") {
      triggerWhatsApp(quote);
      toast.success('Status: Enviado. WhatsApp aberto!');
    } else if (newStatus === "aprovado") {
      toast.success("Aprovado! Obra criada automaticamente. 🎉");
    } else if (newStatus === "perdido") {
      toast("Marcado como Perdido.");
    } else {
      toast.success(`Status: ${QUOTE_STATUS_LABELS[newStatus]}`);
    }
  };

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

  const CHART_STATUSES: QuoteStatus[] = ["orcado", "aguardando", "aprovado", "perdido"];
  const chartByStatus = quotesByStatus.filter((d) => CHART_STATUSES.includes(d.status));
  const qtyData = chartByStatus.filter((d) => d.count > 0).map((d) => ({ name: d.label, value: d.count, color: d.color }));
  const valueData = chartByStatus.filter((d) => d.total > 0).map((d) => ({ name: d.label, value: d.total, color: d.color }));
  const hasData = quotes.length > 0;
  const renderLabel = ({ percent }: { percent: number }) =>
    percent > 0 ? `${(percent * 100).toFixed(0)}%` : "";

  const activeQuote = activeId ? quotes.find((q) => q.id === activeId) : null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Orçamentos" backTo="/app" />

      <div className="container py-6 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Meus Orçamentos</h2>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewAndStore("kanban")}
                title="Kanban"
                className={`p-1.5 rounded-md transition-colors ${
                  view === "kanban"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewAndStore("list")}
                title="Lista"
                className={`p-1.5 rounded-md transition-colors ${
                  view === "list"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Link to="/app/novo-orcamento">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Novo
              </Button>
            </Link>
          </div>
        </div>

        {/* Charts — só na visualização lista */}
        {hasData && view === "list" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-4 shadow-card">
              <h3 className="text-xs font-bold text-muted-foreground text-center mb-2 uppercase tracking-wide">
                Quantidade
              </h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qtyData}
                      cx="50%"
                      cy="50%"
                      outerRadius={68}
                      dataKey="value"
                      label={renderLabel}
                      labelLine={false}
                      stroke="none"
                    >
                      {qtyData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v} orçamento(s)`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {chartByStatus.map((d) => (
                  <div key={d.status} className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">
                      {d.label} ({d.count})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 shadow-card">
              <h3 className="text-xs font-bold text-muted-foreground text-center mb-2 uppercase tracking-wide">
                Valores (R$)
              </h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={valueData}
                      cx="50%"
                      cy="50%"
                      outerRadius={68}
                      dataKey="value"
                      label={renderLabel}
                      labelLine={false}
                      stroke="none"
                    >
                      {valueData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {chartByStatus.map((d) => (
                  <div key={d.status} className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">
                      {d.label} ({fmt(d.total)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {quotes.length === 0 && (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum orçamento ainda.</p>
          </div>
        )}

        {/* ========== KANBAN VIEW ========== */}
        {quotes.length > 0 && view === "kanban" && (
          <DndContext
            sensors={sensors}
            onDragStart={({ active }) => setActiveId(active.id as string)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            {/* Hint */}
            <p className="text-xs text-muted-foreground -mt-2">
              Arraste os cards entre colunas ou use os botões de ação rápida.
            </p>

            {/* Board — horizontal scroll */}
            <div className="overflow-x-auto pb-4 -mx-4 px-4">
              <div className="flex gap-3" style={{ minWidth: "max-content" }}>
                {quotesByStatus.map((group) => (
                  <KanbanColumn
                    key={group.status}
                    status={group.status}
                    label={group.label}
                    color={group.color}
                    quotes={group.quotes}
                    onStatusChange={handleStatusChange}
                    novoId={novoId}
                  />
                ))}
              </div>
            </div>

            {/* Drag overlay */}
            <DragOverlay dropAnimation={null}>
              {activeQuote && (
                <div className="bg-card rounded-xl shadow-elevated border border-primary/40 p-3 w-[220px] opacity-95 rotate-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-foreground text-sm">{activeQuote.clientName}</h3>
                    <span className="font-bold text-primary text-sm">{fmt(activeQuote.total)}</span>
                  </div>
                  {activeQuote.jobType && (
                    <p className="text-xs text-muted-foreground truncate">{activeQuote.jobType}</p>
                  )}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        {/* ========== LIST VIEW ========== */}
        {quotes.length > 0 && view === "list" && (
          <div className="space-y-5">
            {quotesByStatus
              .filter((g) => g.count > 0)
              .map((group) => {
                return (
                  <div key={group.status}>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="text-sm font-bold text-foreground">
                        {group.label} ({group.count})
                      </span>
                      <span className="text-xs text-muted-foreground">— {fmt(group.total)}</span>
                    </div>
                    <div className="space-y-2">
                      {group.quotes.map((q, i) => {
                        const qStatus = (q.status || "orcado") as QuoteStatus;
                        const qShowWA = qStatus === "orcado" || qStatus === "enviado";
                        const qShowAprovar = qStatus !== "aprovado" && qStatus !== "perdido";
                        const qShowPerdido = qStatus !== "aprovado" && qStatus !== "perdido";
                        const isNovo = q.id === novoId;
                        return (
                        <motion.div
                          key={q.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <div className={`bg-card rounded-xl shadow-card hover:shadow-elevated transition-shadow ${isNovo ? "ring-2 ring-primary/40 border border-primary/40" : ""}`}>
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-1">
                                <Link to={`/app/orcamento/${q.id}`} className="font-bold text-foreground truncate hover:text-primary transition-colors">
                                  {q.clientName}
                                </Link>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                    QUOTE_STATUS_BG[group.status]
                                  }`}
                                >
                                  {group.label}
                                </span>
                              </div>
                              {q.jobType && (
                                <p className="text-sm text-muted-foreground mb-2">{q.jobType}</p>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(q.createdAt).toLocaleDateString("pt-BR")} ·{" "}
                                  {q.items.length} {q.items.length === 1 ? "item" : "itens"}
                                </span>
                                <span className="font-bold text-primary">{fmt(q.total)}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 px-4 pb-3 border-t border-border/50 pt-2 flex-wrap">
                              <Link
                                to={`/app/orcamento/${q.id}`}
                                className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                              >
                                <Eye className="h-3 w-3" /> Ver Orçamento
                              </Link>
                              {qShowWA && (
                                <button
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    await handleStatusChange(q.id, "enviado");
                                    triggerWhatsApp(q);
                                    toast.success("Enviado! WhatsApp aberto.");
                                  }}
                                  className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-[hsl(215,80%,55%)]/10 text-[hsl(215,80%,45%)] hover:bg-[hsl(215,80%,55%)]/20 transition-colors"
                                >
                                  <Send className="h-3 w-3" /> Enviar WA
                                </button>
                              )}
                              {qShowAprovar && (
                                <button
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    await handleStatusChange(q.id, "aprovado");
                                    toast.success("Aprovado! Obra criada. 🎉");
                                  }}
                                  className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                                >
                                  <CheckCircle2 className="h-3 w-3" /> Aprovar
                                </button>
                              )}
                              {qShowPerdido && (
                                <button
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    await handleStatusChange(q.id, "perdido");
                                    toast("Marcado como Perdido.");
                                  }}
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
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteList;
