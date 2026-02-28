import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Trash2, Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app/AppHeader";
import { getQuote, getProfile } from "@/lib/storage";
import { useData } from "@/lib/DataContext";
import { Quote, QuoteStatus, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from "@/lib/types";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { generateQuotePdf } from "@/lib/generateQuotePdf";
import { maskWhatsApp } from "@/lib/whatsappMask";

const FLOW_STEPS: { status: QuoteStatus; label: string }[] = [
  { status: 'orcado', label: 'Orçado' },
  { status: 'enviado', label: 'Enviado' },
  { status: 'aguardando', label: 'Aguardando' },
  { status: 'fechado', label: 'Fechado' },
];

function getFlowIndex(status: QuoteStatus): number {
  if (status === 'perdido') return -1;
  return FLOW_STEPS.findIndex(s => s.status === status);
}

const QuoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { changeQuoteStatus, removeQuote } = useData();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [sending, setSending] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    getQuote(id).then(q => {
      if (!q) {
        toast.error("Orçamento não encontrado.");
        navigate("/app/orcamentos");
        return;
      }
      setQuote(q);
    });
  }, [id, navigate]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleDelete = async () => {
    if (!id) return;
    if (confirm("Excluir este orçamento?")) {
      await removeQuote(id);
      toast.success("Orçamento excluído.");
      navigate("/app/orcamentos");
    }
  };

  const currentStatus = (quote?.status || 'orcado') as QuoteStatus;
  const flowIndex = getFlowIndex(currentStatus);
  const isPerdido = currentStatus === 'perdido';
  const progressValue = isPerdido ? 0 : ((flowIndex + 1) / FLOW_STEPS.length) * 100;

  const handleSendWhatsApp = async () => {
    if (!quote || !id) return;
    
    const clientPhone = quote.clientPhone?.replace(/\D/g, '');
    if (!clientPhone || clientPhone.length !== 11) {
      toast.error("Telefone do cliente não cadastrado. Edite o orçamento e adicione.");
      return;
    }

    setSending(true);
    try {
      // Get user profile for WhatsApp and name
      const profile = await getProfile();
      const userWhatsapp = profile?.whatsapp ? maskWhatsApp(profile.whatsapp) : '';
      const userName = profile?.fullName || quote.companyInfo.name || 'Empresa';

      // Generate PDF
      const doc = generateQuotePdf(quote, userWhatsapp);
      const pdfBlob = doc.output('blob');
      const fileName = `orcamento-${quote.clientName.replace(/\s+/g, '-').toLowerCase()}-${id.slice(0, 8)}.pdf`;

      // Upload to storage
      let pdfUrl = '';
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('quote-pdfs')
          .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from('quote-pdfs').getPublicUrl(fileName);
          pdfUrl = urlData.publicUrl;
        }
      } catch {
        // fallback below
      }

      // Build WhatsApp message with clean app URL
      const appUrl = `${window.location.origin}/orcamento-publico/${id}`;
      const message = `Olá ${quote.clientName}! Segue o orçamento conforme solicitado: ${appUrl}\n\nQualquer dúvida estou à disposição!\nAtt, ${userName}`;

      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/55${clientPhone}?text=${encoded}`, '_blank');

      // Update status to 'enviado'
      await changeQuoteStatus(id, 'enviado');
      setQuote({ ...quote, status: 'enviado' });
      toast.success('Orçamento enviado! Status alterado para "Enviado".');
    } catch (err) {
      toast.error("Erro ao enviar orçamento.");
    } finally {
      setSending(false);
    }
  };

  const handleApprove = async () => {
    if (!quote || !id) return;
    await changeQuoteStatus(id, 'fechado');
    toast.success("Orçamento aprovado! Obra criada automaticamente em Minhas Obras. 🎉");
    navigate("/app");
  };

  const handleLost = async () => {
    if (!quote || !id) return;
    await changeQuoteStatus(id, 'perdido');
    setQuote({ ...quote, status: 'perdido' });
    toast("Orçamento marcado como Perdido.");
  };

  if (!quote) return null;

  const date = new Date(quote.createdAt).toLocaleDateString("pt-BR");
  const co = quote.companyInfo;

  return (
    <div className="min-h-screen bg-muted">
      <AppHeader title="Orçamento" backTo="/app/orcamentos" />

      <div className="container py-6 max-w-2xl space-y-4">

        {/* ===== FLOW PROGRESS BAR ===== */}
        <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wide">
            <span>Fluxo do Orçamento</span>
            {isPerdido && <span className="text-destructive">Perdido</span>}
          </div>
          <Progress value={progressValue} className="h-2" />
          <div className="flex justify-between">
            {FLOW_STEPS.map((step, i) => {
              const isActive = !isPerdido && flowIndex >= i;
              const isCurrent = !isPerdido && flowIndex === i;
              return (
                <div key={step.status} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${
                      isCurrent
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isActive
                          ? 'border-success bg-success text-white'
                          : 'border-border bg-muted text-muted-foreground'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className={`text-[10px] ${isCurrent ? 'text-primary font-bold' : isActive ? 'text-success font-semibold' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== ACTION BUTTONS BY STAGE ===== */}
        <div className="flex gap-2 flex-wrap">
          {currentStatus === 'orcado' && (
            <Button className="flex-1 gap-2" onClick={handleSendWhatsApp} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar para Cliente (WhatsApp)
            </Button>
          )}

          {(currentStatus === 'enviado' || currentStatus === 'aguardando') && (
            <>
              <Button className="flex-1 gap-2 bg-success hover:bg-success/90 text-white" onClick={handleApprove}>
                <CheckCircle2 className="h-4 w-4" /> Aprovar Orçamento
              </Button>
              <Button variant="destructive" className="flex-1 gap-2" onClick={handleLost}>
                <XCircle className="h-4 w-4" /> Perdido
              </Button>
            </>
          )}

          {currentStatus === 'fechado' && (
            <div className="flex-1 bg-success/10 text-success rounded-lg px-4 py-3 text-sm font-bold text-center">
              ✅ Orçamento aprovado — Obra criada em Minhas Obras
            </div>
          )}

          {isPerdido && (
            <div className="flex-1 bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm font-bold text-center">
              ❌ Orçamento perdido
            </div>
          )}

          <Button variant="outline" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* ===== DOCUMENT STYLE ===== */}
        <div ref={printRef} className="bg-white text-[hsl(215,25%,15%)] rounded-sm shadow-elevated" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          
          {co.name && (
            <div className="bg-[hsl(215,25%,15%)] text-white px-6 py-5 text-center">
              <h1 className="text-2xl font-extrabold tracking-widest uppercase">{co.name}</h1>
            </div>
          )}

          <div className="px-6 py-2">
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

            <div className="border border-[hsl(214,20%,88%)] rounded-sm mb-4">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-[hsl(214,20%,88%)]">
                    <td className="px-3 py-2 font-bold text-[hsl(215,10%,45%)] w-24">Cliente:</td>
                    <td className="px-3 py-2 font-bold">{quote.clientName}</td>
                    <td className="px-3 py-2 font-bold text-[hsl(215,10%,45%)] w-20 text-right">Data:</td>
                    <td className="px-3 py-2 text-right w-28">{date}</td>
                  </tr>
                  {quote.clientPhone && (
                    <tr className="border-b border-[hsl(214,20%,88%)]">
                      <td className="px-3 py-2 font-bold text-[hsl(215,10%,45%)]">Telefone:</td>
                      <td className="px-3 py-2" colSpan={3}>{maskWhatsApp(quote.clientPhone)}</td>
                    </tr>
                  )}
                  {quote.jobType && (
                    <tr>
                      <td className="px-3 py-2 font-bold text-[hsl(215,10%,45%)]">Tipo:</td>
                      <td className="px-3 py-2" colSpan={3}>{quote.jobType}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-center mb-4">
              <h2 className="text-xl font-extrabold tracking-wide uppercase">ORÇAMENTO</h2>
            </div>

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

            <div className="mb-8 text-sm text-[hsl(215,10%,45%)] space-y-1">
              <p className="font-bold">- PROPOSTA VÁLIDA POR 7 (SETE) DIAS ÚTEIS;</p>
              <p className="font-bold">- CONDIÇÕES DE PAGAMENTO A COMBINAR;</p>
              {quote.notes && (
                <div className="mt-3 whitespace-pre-wrap text-[hsl(215,25%,15%)]">
                  <span className="font-bold">Obs: </span>{quote.notes}
                </div>
              )}
            </div>

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

function buildWhatsAppText(q: Quote, userName: string): string {
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
  lines.push("");
  lines.push(`Qualquer dúvida estou à disposição!\nAtt, ${userName}`);
  if (q.notes) {
    lines.push("");
    lines.push(`Obs: ${q.notes}`);
  }
  return lines.join("\n");
}

export default QuoteDetail;
