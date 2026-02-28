import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Share2, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app/AppHeader";
import { getQuote, deleteQuote, getQuotes, saveQuotes } from "@/lib/storage";
import { Quote, QuoteStatus, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from "@/lib/types";
import { toast } from "sonner";

const ALL_STATUSES: QuoteStatus[] = ['orcado', 'enviado', 'aguardando', 'fechado', 'perdido'];

const QuoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const q = getQuote(id);
    if (!q) {
      toast.error("Orçamento não encontrado.");
      navigate("/app/orcamentos");
      return;
    }
    setQuote(q);
  }, [id, navigate]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleDelete = () => {
    if (!id) return;
    if (confirm("Excluir este orçamento?")) {
      deleteQuote(id);
      toast.success("Orçamento excluído.");
      navigate("/app/orcamentos");
    }
  };

  const handleChangeStatus = (newStatus: QuoteStatus) => {
    if (!quote || !id) return;
    const quotes = getQuotes();
    const idx = quotes.findIndex((q) => q.id === id);
    if (idx !== -1) {
      quotes[idx] = { ...quotes[idx], status: newStatus };
      saveQuotes(quotes);
      setQuote({ ...quote, status: newStatus });
      toast.success(`Status alterado para "${QUOTE_STATUS_LABELS[newStatus]}".`);
      setStatusOpen(false);
    }
  };

  const handleShare = async () => {
    if (!quote) return;
    const text = buildShareText(quote);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Orçamento - ${quote.clientName}`, text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Orçamento copiado para a área de transferência!");
    }
  };

  if (!quote) return null;

  const date = new Date(quote.createdAt).toLocaleDateString("pt-BR");
  const co = quote.companyInfo;

  return (
    <div className="min-h-screen bg-muted">
      <AppHeader title="Orçamento" backTo="/app/orcamentos" />

      <div className="container py-6 max-w-2xl space-y-4">
        {/* Actions */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setStatusOpen(!statusOpen)}
              style={{ borderColor: QUOTE_STATUS_COLORS[(quote.status || 'orcado') as QuoteStatus], color: QUOTE_STATUS_COLORS[(quote.status || 'orcado') as QuoteStatus] }}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: QUOTE_STATUS_COLORS[(quote.status || 'orcado') as QuoteStatus] }} />
              {QUOTE_STATUS_LABELS[(quote.status || 'orcado') as QuoteStatus]}
              <ChevronDown className={`h-4 w-4 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
            </Button>
            {statusOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-lg shadow-elevated border border-border z-50 overflow-hidden">
                {ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleChangeStatus(s)}
                    className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors ${(quote.status || 'orcado') === s ? 'bg-muted font-bold' : ''}`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: QUOTE_STATUS_COLORS[s] }} />
                    {QUOTE_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" /> Compartilhar
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* ===== DOCUMENT STYLE ===== */}
        <div ref={printRef} className="bg-white text-[hsl(215,25%,15%)] rounded-sm shadow-elevated" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          
          {/* Company Header */}
          {co.name && (
            <div className="bg-[hsl(215,25%,15%)] text-white px-6 py-5 text-center">
              <h1 className="text-2xl font-extrabold tracking-widest uppercase">{co.name}</h1>
            </div>
          )}

          <div className="px-6 py-2">
            {/* Company sub-info */}
            {(co.address || co.cnpjCpf || co.phone) && (
              <div className="text-center text-xs text-[hsl(215,10%,45%)] border-b border-[hsl(214,20%,88%)] pb-3 mb-4">
                {co.address && <p>{co.address}</p>}
                <p>
                  {co.cnpjCpf && <span>CNPJ/CPF: {co.cnpjCpf}</span>}
                  {co.cnpjCpf && co.phone && <span> &nbsp;|&nbsp; </span>}
                  {co.phone && <span>Fone: {co.phone}</span>}
                </p>
                {co.email && <p>{co.email}</p>}
              </div>
            )}

            {/* Client info block */}
            <div className="border border-[hsl(214,20%,88%)] rounded-sm mb-4">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-[hsl(214,20%,88%)]">
                    <td className="px-3 py-2 font-bold text-[hsl(215,10%,45%)] w-24">Cliente:</td>
                    <td className="px-3 py-2 font-bold">{quote.clientName}</td>
                    <td className="px-3 py-2 font-bold text-[hsl(215,10%,45%)] w-20 text-right">Data:</td>
                    <td className="px-3 py-2 text-right w-28">{date}</td>
                  </tr>
                  {quote.jobType && (
                    <tr>
                      <td className="px-3 py-2 font-bold text-[hsl(215,10%,45%)]">Tipo:</td>
                      <td className="px-3 py-2" colSpan={3}>{quote.jobType}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Title */}
            <div className="text-center mb-4">
              <h2 className="text-xl font-extrabold tracking-wide uppercase">ORÇAMENTO</h2>
            </div>

            {/* Items Table */}
            <div className="border border-[hsl(214,20%,88%)] rounded-sm mb-4 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[hsl(210,15%,93%)] text-[hsl(215,10%,45%)] font-bold text-xs uppercase">
                    <th className="text-left px-3 py-2 w-10">#</th>
                    <th className="text-left px-3 py-2">Descrição</th>
                    <th className="text-center px-3 py-2 w-16">Qtd.</th>
                    <th className="text-right px-3 py-2 w-24">Unit.</th>
                    <th className="text-right px-3 py-2 w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, i) => (
                    <tr key={item.id} className="border-t border-[hsl(214,20%,88%)]">
                      <td className="px-3 py-2 text-[hsl(215,10%,45%)] font-bold">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-bold">{item.description}</div>
                        {(item.width || item.height) && (
                          <div className="text-xs text-[hsl(215,10%,45%)]">
                            {item.width ? `${item.width}m` : '—'} × {item.height ? `${item.height}m` : '—'}
                            {item.width && item.height && (
                              <span className="ml-1">({(item.width * item.height).toFixed(2)}m²)</span>
                            )}
                          </div>
                        )}
                        {item.location && (
                          <div className="text-xs text-[hsl(215,80%,45%)]">📍 {item.location}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-[hsl(215,10%,45%)]">{fmt(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-bold">{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="border border-[hsl(214,20%,88%)] rounded-sm mb-6 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="bg-[hsl(215,25%,15%)] text-white">
                    <td className="px-3 py-3 font-extrabold uppercase tracking-wide">VALOR TOTAL:</td>
                    <td className="px-3 py-3 text-right font-extrabold text-lg">{fmt(quote.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Notes / Conditions */}
            <div className="mb-8 text-sm text-[hsl(215,10%,45%)] space-y-1">
              <p className="font-bold">- PROPOSTA VÁLIDA POR DEZ DIAS ÚTEIS;</p>
              <p className="font-bold">- CONDIÇÕES DE PAGAMENTO A COMBINAR;</p>
              {quote.notes && (
                <div className="mt-3 whitespace-pre-wrap text-[hsl(215,25%,15%)]">
                  <span className="font-bold">Obs: </span>{quote.notes}
                </div>
              )}
            </div>

            {/* Signatures */}
            <div className="flex justify-between px-4 pb-8 pt-8">
              <div className="text-center">
                <div className="border-t border-[hsl(215,25%,15%)] w-48 mx-auto mb-1" />
                <span className="text-sm font-bold text-[hsl(215,10%,45%)]">Cliente</span>
              </div>
              <div className="text-center">
                <div className="border-t border-[hsl(215,25%,15%)] w-48 mx-auto mb-1" />
                <span className="text-sm font-bold text-[hsl(215,10%,45%)]">Consultor(a) de vendas</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function buildShareText(q: Quote): string {
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const lines: string[] = [];
  if (q.companyInfo.name) lines.push(`*${q.companyInfo.name}*`);
  if (q.companyInfo.phone) lines.push(q.companyInfo.phone);
  lines.push("");
  lines.push(`📋 *ORÇAMENTO*`);
  lines.push(`Cliente: ${q.clientName}`);
  if (q.jobType) lines.push(`Tipo: ${q.jobType}`);
  lines.push(`Data: ${new Date(q.createdAt).toLocaleDateString("pt-BR")}`);
  lines.push("");
  q.items.forEach(item => {
    const local = item.location ? ` — 📍 ${item.location}` : '';
    const medidas = (item.width || item.height) ? ` (${item.width || '—'}m × ${item.height || '—'}m)` : '';
    lines.push(`▸ ${item.description}${local}${medidas} — ${item.quantity}x ${fmt(item.unitPrice)} = ${fmt(item.total)}`);
  });
  lines.push("");
  lines.push(`💰 *Total: ${fmt(q.total)}*`);
  if (q.notes) {
    lines.push("");
    lines.push(`Obs: ${q.notes}`);
  }
  return lines.join("\n");
}

export default QuoteDetail;
