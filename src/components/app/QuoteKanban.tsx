import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import { useData } from "@/lib/DataContext";
import { Quote, QuoteStatus, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from "@/lib/types";
import { toast } from "sonner";
import { QuoteSendMenu } from "./QuoteSendMenu";
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

const KANBAN_STATUSES: QuoteStatus[] = ["orcado", "enviado", "aprovado", "perdido"];

function triggerWhatsAppSimples(quote: Quote) {
  const phone = quote.clientPhone?.replace(/\D/g, "");
  if (!phone || phone.length !== 11) return;
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

  const showWA = status === "orcado";
  const showAprovar = status === "enviado" || status === "aguardando";
  const showPerdido = status === "enviado" || status === "aguardando";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card rounded-xl border select-none transition-shadow ${
        isDragging ? "opacity-40 shadow-sm" : "shadow-card"
      } ${isNew ? "border-primary/60 ring-2 ring-primary/30" : "border-border/50"}`}
    >
      {/* Área arrastável */}
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-foreground text-sm leading-tight">{quote.clientName}</h3>
          <span className="font-bold text-primary text-sm whitespace-nowrap">{fmt(quote.total)}</span>
        </div>
        {quote.jobType && (
          <p className="text-xs text-muted-foreground mb-1 truncate">{quote.jobType}</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          {quote.quoteNumber && (
            <span className="font-semibold text-primary/70 mr-1.5">#{quote.quoteNumber}</span>
          )}
          {new Date(quote.createdAt).toLocaleDateString("pt-BR")} ·{" "}
          {quote.items.length} {quote.items.length === 1 ? "item" : "itens"}
        </p>
      </div>

      {/* Ações rápidas */}
      <div className="flex gap-1 px-2 pb-2.5 flex-wrap border-t border-border/40 pt-1.5">
        <Link
          to={`/app/orcamento/${quote.id}`}
          className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          onClick={(e) => isDragging && e.preventDefault()}
        >
          <Eye className="h-2.5 w-2.5" /> Ver + Editar
        </Link>
        {showWA && (
          <QuoteSendMenu quote={quote} onStatusChange={onStatusChange} size="sm" />
        )}
        {showAprovar && (
          <button
            onClick={async (e) => {
              e.preventDefault();
              await onStatusChange(quote.id, "aprovado");
              toast.success("Obra criada com sucesso!");
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
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <p className="text-xs font-bold text-foreground leading-tight flex-1 min-w-0 truncate">
          {label} ({quotes.length}){quotes.length > 0 ? ` — ${fmt(total)}` : ""}
        </p>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 space-y-2 min-h-[140px] transition-all duration-150 ${
          isOver ? "bg-primary/8 ring-2 ring-primary/40 ring-inset" : "bg-muted/40"
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

// ===== BOARD KANBAN EXPORTADO =====
export function QuoteKanban({ novoId }: { novoId?: string | null }) {
  const { quotes, changeQuoteStatus } = useData();
  const [activeId, setActiveId] = useState<string | null>(null);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const kanbanByStatus = KANBAN_STATUSES.map((status) => {
    const filtered = quotes.filter((q) => {
      const s = (q.status || "orcado") as QuoteStatus;
      if (status === "enviado") return s === "enviado" || s === "aguardando";
      return s === status;
    });
    return {
      status,
      label: QUOTE_STATUS_LABELS[status],
      color: QUOTE_STATUS_COLORS[status],
      quotes: filtered,
    };
  });

  const handleStatusChange = async (id: string, newStatus: QuoteStatus) => {
    await changeQuoteStatus(id, newStatus);
  };

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
      triggerWhatsAppSimples(quote);
      toast.success("Status: Enviado. WhatsApp aberto!");
    } else if (newStatus === "aprovado") {
      toast.success("Obra criada com sucesso!");
    } else if (newStatus === "perdido") {
      toast("Marcado como Perdido.");
    } else {
      toast.success(`Status: ${QUOTE_STATUS_LABELS[newStatus]}`);
    }
  };

  const activeQuote = activeId ? quotes.find((q) => q.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => setActiveId(active.id as string)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <p className="text-xs text-muted-foreground mb-3">
        Arraste os cards entre colunas ou use os botões de ação rápida.
      </p>

      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
          {kanbanByStatus.map((group) => (
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
  );
}
