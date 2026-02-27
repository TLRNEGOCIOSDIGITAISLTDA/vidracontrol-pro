import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Share2, Trash2, Building2, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app/AppHeader";
import { getQuote, deleteQuote } from "@/lib/storage";
import { Quote } from "@/lib/types";
import { toast } from "sonner";
import { motion } from "framer-motion";

const QuoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
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
    <div className="min-h-screen bg-background">
      <AppHeader title="Orçamento" backTo="/app/orcamentos" />

      <div className="container py-6 max-w-lg space-y-4">
        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" /> Compartilhar
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Quote preview */}
        <div ref={printRef} className="bg-card rounded-xl shadow-elevated p-6 space-y-5">
          {/* Company header */}
          {co.name && (
            <div className="text-center border-b border-border pb-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-lg text-foreground">{co.name}</h2>
              </div>
              {co.cnpjCpf && <p className="text-xs text-muted-foreground">{co.cnpjCpf}</p>}
              {co.phone && <p className="text-xs text-muted-foreground">{co.phone}</p>}
              {co.email && <p className="text-xs text-muted-foreground">{co.email}</p>}
              {co.address && <p className="text-xs text-muted-foreground">{co.address}</p>}
            </div>
          )}

          {/* Title */}
          <div className="text-center">
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Orçamento</h3>
            <p className="text-xs text-muted-foreground">Data: {date}</p>
          </div>

          {/* Client */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-bold text-foreground">{quote.clientName}</p>
            </div>
          </div>

          {quote.jobType && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Tipo da Obra</p>
                <p className="font-medium text-foreground">{quote.jobType}</p>
              </div>
            </div>
          )}

          {/* Items table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 bg-muted text-xs font-bold text-muted-foreground p-2">
              <span className="col-span-5">Item</span>
              <span className="col-span-2 text-center">Qtd</span>
              <span className="col-span-2 text-right">Unit.</span>
              <span className="col-span-3 text-right">Total</span>
            </div>
            {quote.items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-12 text-sm p-2 border-t border-border items-center"
              >
                <span className="col-span-5 text-foreground truncate">{item.description}</span>
                <span className="col-span-2 text-center text-muted-foreground">{item.quantity}</span>
                <span className="col-span-2 text-right text-muted-foreground">{fmt(item.unitPrice)}</span>
                <span className="col-span-3 text-right font-bold text-foreground">{fmt(item.total)}</span>
              </motion.div>
            ))}
          </div>

          {/* Total */}
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <span className="text-sm text-muted-foreground">Valor Total</span>
            <div className="text-2xl font-bold text-primary">{fmt(quote.total)}</div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-bold text-muted-foreground mb-1">Observações:</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
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
    lines.push(`▸ ${item.description} — ${item.quantity}x ${fmt(item.unitPrice)} = ${fmt(item.total)}`);
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
