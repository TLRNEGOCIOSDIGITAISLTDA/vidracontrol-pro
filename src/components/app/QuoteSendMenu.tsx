import { useState, useRef, useEffect } from "react";
import { Send, FileText, MessageSquare } from "lucide-react";
import { Quote, QuoteStatus } from "@/lib/types";
import { toast } from "sonner";
import { getProfile } from "@/lib/storage";
import { generateQuotePdf } from "@/lib/generateQuotePdf";
import { maskWhatsApp } from "@/lib/whatsappMask";

interface Props {
  quote: Quote;
  onStatusChange: (id: string, status: QuoteStatus) => Promise<void>;
  size?: "sm" | "md";
}

export function QuoteSendMenu({ quote, onStatusChange, size = "sm" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleText = async () => {
    setOpen(false);
    const phone = quote.clientPhone?.replace(/\D/g, "");
    if (!phone || phone.length !== 11) {
      toast.error("Telefone do cliente não cadastrado.");
      return;
    }

    const profile = await getProfile();
    const companyName = quote.companyInfo?.name || profile?.fullName || "Empresa";
    const displayUnit = profile?.defaultUnit ?? 'mm';

    const itemLines = quote.items
      .map((item) => {
        const hasDims = item.width && item.height;
        const dw = hasDims ? (displayUnit === 'cm' ? item.width! / 10 : item.width!) : 0;
        const dh = hasDims ? (displayUnit === 'cm' ? item.height! / 10 : item.height!) : 0;
        const dimsStr = hasDims ? ` (${dw}${displayUnit}×${dh}${displayUnit})` : "";
        return `• ${item.description}${dimsStr} — ${item.quantity}x ${fmt(item.unitPrice)} = ${fmt(item.total)}`;
      })
      .join("\n");

    const numLabel = quote.quoteNumber ? ` (N ${quote.quoteNumber})` : "";
    const msg = [
      `Ola ${quote.clientName}! Segue o orcamento${numLabel} conforme solicitado:`,
      "",
      `*${companyName.toUpperCase()}*`,
      "",
      `*Itens do orcamento:*`,
      itemLines,
      "",
      `*Valor total: ${fmt(quote.total)}*`,
      `Validade: 7 dias uteis`,
      ...(quote.rtName ? [`Responsavel Tecnico: ${quote.rtName}`] : []),
      "",
      `Qualquer duvida estou a disposicao!`,
      `Att, ${companyName}`,
    ].join("\n");

    await onStatusChange(quote.id, "enviado");
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    toast.success("Enviado! WhatsApp aberto.");
  };

  const handlePdf = async () => {
    setOpen(false);
    const profile = await getProfile();
    const whatsapp = profile?.whatsapp ? maskWhatsApp(profile.whatsapp) : "";

    const displayUnit = profile?.defaultUnit ?? 'mm';
    const doc = await generateQuotePdf(quote, whatsapp, displayUnit);
    const fileName = `orcamento-${quote.clientName.replace(/\s+/g, "-").toLowerCase()}-${quote.id.slice(0, 8)}.pdf`;

    await onStatusChange(quote.id, "enviado");

    if (navigator.share) {
      try {
        const blob = doc.output("blob");
        const file = new File([blob], fileName, { type: "application/pdf" });
        await navigator.share({ files: [file], title: `Orçamento — ${quote.clientName}` });
        toast.success("PDF compartilhado! Status: Enviado.");
      } catch {
        // Usuário cancelou ou erro — faz download como fallback
        doc.save(fileName);
        toast.success("PDF gerado! Status: Enviado.");
      }
    } else {
      doc.save(fileName);
      toast.success("PDF baixado! Status: Enviado.");
    }
  };

  const isSm = size === "sm";
  const btnClass = isSm
    ? "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md"
    : "flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`${btnClass} bg-[hsl(215,80%,55%)]/10 text-[hsl(215,80%,45%)] hover:bg-[hsl(215,80%,55%)]/20 transition-colors`}
      >
        <Send className={isSm ? "h-2.5 w-2.5" : "h-3 w-3"} /> Enviar WA
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 z-50 bg-card border border-border rounded-lg shadow-elevated min-w-[170px] py-1">
          <button
            onClick={handleText}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-foreground hover:bg-muted transition-colors text-left"
          >
            <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(215,80%,45%)]" />
            Enviar texto formatado
          </button>
          <button
            onClick={handlePdf}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-foreground hover:bg-muted transition-colors text-left"
          >
            <FileText className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(145,60%,42%)]" />
            Gerar e compartilhar PDF
          </button>
        </div>
      )}
    </div>
  );
}
