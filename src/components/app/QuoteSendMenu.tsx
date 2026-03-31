import { useState, useRef, useEffect } from "react";
import { Send, FileText, Download, Share2 } from "lucide-react";
import { Quote, QuoteStatus } from "@/lib/types";
import { toast } from "sonner";
import { getProfile, getCompanyInfo } from "@/lib/storage";
import { generateQuotePdf } from "@/lib/generateQuotePdf";
import { maskWhatsApp } from "@/lib/whatsappMask";

interface Props {
  quote: Quote;
  onStatusChange: (id: string, status: QuoteStatus) => Promise<void>;
  size?: "sm" | "md";
}

export function QuoteSendMenu({ quote, onStatusChange, size = "sm" }: Props) {
  const [pdfOpen, setPdfOpen] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pdfOpen) return;
    const handler = (e: MouseEvent) => {
      if (pdfRef.current && !pdfRef.current.contains(e.target as Node)) setPdfOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pdfOpen]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // ── WhatsApp: ação direta, mensagem simples com link público ──────────────
  const handleWhatsApp = async () => {
    const phone = quote.clientPhone?.replace(/\D/g, "");
    if (!phone || phone.length !== 11) {
      toast.error("Telefone do cliente não cadastrado.");
      return;
    }

    const profile = await getProfile();
    const sellerName = profile?.fullName || "";
    const companyName = quote.companyInfo?.name || "";
    const quoteLink = `${window.location.origin}/orcamento-publico/${quote.id}`;

    const lines = [
      `Ola, ${quote.clientName}! Tudo bem?`,
      ``,
      `Segue seu orcamento conforme solicitado:`,
      quoteLink,
      ``,
      `Valor total: ${fmt(quote.total)}`,
      ``,
      `Qualquer duvida, estou a disposicao.`,
      ``,
      `Atenciosamente,`,
      ...(sellerName ? [sellerName] : []),
      ...(companyName ? [companyName] : []),
    ];

    const msg = lines.join("\n");
    await onStatusChange(quote.id, "enviado");
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    toast.success("WhatsApp aberto!");
  };

  // ── PDF: busca logo fresca antes de gerar ─────────────────────────────────
  const buildPdfDoc = async () => {
    const [profile, freshCompany] = await Promise.all([getProfile(), getCompanyInfo()]);
    const whatsapp = profile?.whatsapp ? maskWhatsApp(profile.whatsapp) : "";
    const displayUnit = profile?.defaultUnit ?? "mm";
    const quoteWithLogo: Quote = {
      ...quote,
      companyInfo: {
        ...quote.companyInfo,
        logoUrl: quote.companyInfo.logoUrl || freshCompany.logoUrl,
      },
    };
    const doc = await generateQuotePdf(quoteWithLogo, whatsapp, displayUnit);
    return doc;
  };

  const pdfFileName = `orcamento-${quote.clientName.replace(/\s+/g, "-").toLowerCase()}-${quote.id.slice(0, 8)}.pdf`;

  const handleDownload = async () => {
    setPdfOpen(false);
    const doc = await buildPdfDoc();
    await onStatusChange(quote.id, "enviado");
    doc.save(pdfFileName);
    toast.success("PDF baixado!");
  };

  const handleShare = async () => {
    setPdfOpen(false);
    const doc = await buildPdfDoc();
    await onStatusChange(quote.id, "enviado");
    if (navigator.share) {
      try {
        const blob = doc.output("blob");
        const file = new File([blob], pdfFileName, { type: "application/pdf" });
        await navigator.share({ files: [file], title: `Orcamento — ${quote.clientName}` });
        toast.success("PDF compartilhado!");
      } catch {
        doc.save(pdfFileName);
        toast.success("PDF baixado!");
      }
    } else {
      doc.save(pdfFileName);
      toast.success("PDF baixado!");
    }
  };

  const isSm = size === "sm";
  const btnBase = isSm
    ? "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md transition-colors"
    : "flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors";

  return (
    <div className="flex items-center gap-1">
      {/* Botão WA: ação direta, sem menu */}
      <button
        onClick={handleWhatsApp}
        className={`${btnBase} bg-[hsl(215,80%,55%)]/10 text-[hsl(215,80%,45%)] hover:bg-[hsl(215,80%,55%)]/20`}
      >
        <Send className={isSm ? "h-2.5 w-2.5" : "h-3 w-3"} />
        Enviar WA
      </button>

      {/* Botão PDF: dropdown secundário */}
      <div className="relative" ref={pdfRef}>
        <button
          onClick={() => setPdfOpen(v => !v)}
          className={`${btnBase} bg-muted/60 text-muted-foreground hover:bg-muted`}
        >
          <FileText className={isSm ? "h-2.5 w-2.5" : "h-3 w-3"} />
          PDF
        </button>

        {pdfOpen && (
          <div className="absolute bottom-full left-0 mb-1 z-50 bg-card border border-border rounded-lg shadow-elevated min-w-[155px] py-1">
            <button
              onClick={handleDownload}
              className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-foreground hover:bg-muted transition-colors text-left"
            >
              <Download className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(145,60%,42%)]" />
              Baixar PDF
            </button>
            <button
              onClick={handleShare}
              className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-foreground hover:bg-muted transition-colors text-left"
            >
              <Share2 className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(215,80%,45%)]" />
              Compartilhar PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
